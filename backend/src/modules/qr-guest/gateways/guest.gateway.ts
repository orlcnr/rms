import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { GuestWsGuard } from '../guards/guest-ws.guard';
import { GuestSession } from '../interfaces';
import { GuestOrdersService } from '../services/guest-orders.service';
import { GuestSessionsService } from '../services/guest-sessions.service';
import {
  WaiterCallRequest,
  BillRequest,
} from '../services/guest-requests.service';

interface GuestSocketData {
  session: GuestSession;
}

@WebSocketGateway({
  namespace: 'guest',
  cors: {
    origin: '*',
  },
})
export class GuestGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private logger: Logger = new Logger('GuestGateway');

  constructor(
    private guestOrdersService: GuestOrdersService,
    private guestSessionsService: GuestSessionsService,
  ) {
    this.logger.log('GuestGateway constructed');
  }

  afterInit(server: Server) {
    this.logger.log('GuestGateway afterInit - Server initialized');
    // @ts-ignore - accessing internal Socket.IO property for debugging
    const namespaces = Array.from((server as any).io?.nspaces?.keys() || []);
    this.logger.log(
      `Registered namespaces: ${namespaces.join(', ') || 'root only'}`,
    );
  }

  handleConnection(client: Socket, ...args: any[]) {
    this.logger.log(`Guest client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Guest client disconnected: ${client.id}`);
  }

  /**
   * Guest joins their session room
   */
  @UseGuards(GuestWsGuard)
  @SubscribeMessage('guest:join')
  async handleGuestJoin(@ConnectedSocket() client: Socket) {
    const data = client.data as GuestSocketData;
    const { session } = data;

    // Join guest's personal room
    client.join(`guestSession:${session.id}`);
    // Join table room for table-wide updates
    client.join(`table:${session.tableId}`);
    // Join restaurant room for broadcasts
    client.join(`restaurant:${session.restaurantId}`);

    this.logger.log(
      `Guest ${client.id} joined session ${session.id}, table ${session.tableId}`,
    );

    // Notify staff that guest session opened
    this.server
      .to(`restaurant:${session.restaurantId}`)
      .emit('ops:guest_session_opened', {
        sessionId: session.id,
        tableId: session.tableId,
        timestamp: new Date(),
      });

    return { event: 'guest:joined', data: { sessionId: session.id } };
  }

  /**
   * Guest heartbeat to keep session alive
   */
  @UseGuards(GuestWsGuard)
  @SubscribeMessage('guest:heartbeat')
  async handleHeartbeat(@ConnectedSocket() client: Socket) {
    const data = client.data as GuestSocketData;
    const { session } = data;

    const isActive = await this.guestSessionsService.heartbeat(session.id);

    if (!isActive) {
      client.emit('guest:session:revoked', {
        reason: 'Session expired or revoked',
      });
      client.disconnect();
      return {
        event: 'guest:session:revoked',
        data: { reason: 'Session expired' },
      };
    }

    return { event: 'guest:heartbeat:ack', data: { timestamp: new Date() } };
  }

  /**
   * Guest submits an order via WebSocket
   */
  @UseGuards(GuestWsGuard)
  @SubscribeMessage('guest:order:submit')
  async handleOrderSubmit(
    @MessageBody() data: { orderId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const socketData = client.data as GuestSocketData;
    const { session } = socketData;

    try {
      const order = await this.guestOrdersService.submitOrder(
        data.orderId,
        session,
        {},
      );

      // Notify staff about new order submission
      this.server
        .to(`restaurant:${session.restaurantId}`)
        .emit('ops:guest_order_submitted', {
          orderId: order.id,
          tableId: session.tableId,
          sessionId: session.id,
          totalAmount: order.totalAmount,
          timestamp: new Date(),
        });

      // Notify guest
      client.emit('guest:order:status_changed', {
        orderId: order.id,
        status: order.status,
        timestamp: new Date(),
      });

      return { event: 'guest:order:submitted', data: order };
    } catch (error) {
      return { event: 'guest:order:error', data: { message: error.message } };
    }
  }

  /**
   * Guest calls waiter
   */
  @UseGuards(GuestWsGuard)
  @SubscribeMessage('guest:request:waiter')
  async handleWaiterCall(
    @MessageBody()
    data: { reason?: string; urgency?: 'low' | 'medium' | 'high' },
    @ConnectedSocket() client: Socket,
  ) {
    const socketData = client.data as GuestSocketData;
    const { session } = socketData;

    const request: WaiterCallRequest = {
      sessionId: session.id,
      restaurantId: session.restaurantId,
      tableId: session.tableId,
      reason: data.reason,
      urgency: data.urgency || 'medium',
      timestamp: new Date(),
    };

    // Notify staff
    this.server
      .to(`restaurant:${session.restaurantId}`)
      .emit('ops:waiter_call', request);
    this.server.to(`table:${session.tableId}`).emit('ops:waiter_call', request);

    return {
      event: 'guest:request:waiter:ack',
      data: { timestamp: new Date() },
    };
  }

  /**
   * Guest requests bill
   */
  @UseGuards(GuestWsGuard)
  @SubscribeMessage('guest:request:bill')
  async handleBillRequest(
    @MessageBody()
    data: { paymentMethod?: 'cash' | 'card' | 'split'; notes?: string },
    @ConnectedSocket() client: Socket,
  ) {
    const socketData = client.data as GuestSocketData;
    const { session } = socketData;

    const request: BillRequest = {
      sessionId: session.id,
      restaurantId: session.restaurantId,
      tableId: session.tableId,
      paymentMethod: data.paymentMethod,
      notes: data.notes,
      timestamp: new Date(),
    };

    // Notify staff
    this.server
      .to(`restaurant:${session.restaurantId}`)
      .emit('ops:bill_request', request);
    this.server
      .to(`table:${session.tableId}`)
      .emit('ops:bill_request', request);

    // Acknowledge to guest
    client.emit('guest:bill:status', {
      status: 'requested',
      timestamp: request.timestamp,
    });

    return { event: 'guest:request:bill:ack', data: { timestamp: new Date() } };
  }

  /**
   * Staff joins restaurant room
   */
  @SubscribeMessage('staff:join_restaurant')
  handleStaffJoinRestaurant(
    @MessageBody() data: { restaurantId: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.join(`restaurant:${data.restaurantId}`);
    this.logger.log(
      `Staff ${client.id} joined restaurant ${data.restaurantId}`,
    );
    return {
      event: 'staff:joined_restaurant',
      data: { restaurantId: data.restaurantId },
    };
  }

  /**
   * Staff joins table room
   */
  @SubscribeMessage('staff:join_table')
  handleStaffJoinTable(
    @MessageBody() data: { tableId: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.join(`table:${data.tableId}`);
    this.logger.log(`Staff ${client.id} joined table ${data.tableId}`);
    return { event: 'staff:joined_table', data: { tableId: data.tableId } };
  }

  /**
   * Notify staff about waiter call
   */
  notifyWaiterCall(request: WaiterCallRequest): void {
    this.server
      .to(`restaurant:${request.restaurantId}`)
      .emit('ops:waiter_call', request);
    this.server.to(`table:${request.tableId}`).emit('ops:waiter_call', request);
  }

  /**
   * Notify staff about bill request
   */
  notifyBillRequest(request: BillRequest): void {
    this.server
      .to(`restaurant:${request.restaurantId}`)
      .emit('ops:bill_request', request);
    this.server
      .to(`table:${request.tableId}`)
      .emit('ops:bill_request', request);
  }

  /**
   * Notify guest about order status change
   */
  notifyOrderStatusChange(
    sessionId: string,
    data: {
      orderId: string;
      status: string;
      timestamp: Date;
    },
  ): void {
    this.server
      .to(`guestSession:${sessionId}`)
      .emit('guest:order:status_changed', data);
  }

  /**
   * Notify guest about bill status
   */
  notifyGuestBillStatus(
    sessionId: string,
    data: {
      status: string;
      staffName?: string;
      message?: string;
      timestamp: Date;
    },
  ): void {
    this.server.to(`guestSession:${sessionId}`).emit('guest:bill:status', data);
  }

  /**
   * Notify specific guest
   */
  notifyGuest(sessionId: string, event: string, data: any): void {
    this.server.to(`guestSession:${sessionId}`).emit(event, data);
  }

  /**
   * Revoke a guest session and disconnect
   */
  async revokeSession(sessionId: string, reason: string): Promise<void> {
    this.server
      .to(`guestSession:${sessionId}`)
      .emit('guest:session:revoked', { reason });

    // Find and disconnect all sockets in this session room
    const sockets = await this.server
      .in(`guestSession:${sessionId}`)
      .fetchSockets();
    for (const socket of sockets) {
      socket.disconnect(true);
    }

    this.logger.log(`Session ${sessionId} revoked: ${reason}`);
  }

  /**
   * Notify staff about guest session closed
   */
  notifySessionClosed(
    restaurantId: string,
    sessionId: string,
    tableId: string,
  ): void {
    this.server
      .to(`restaurant:${restaurantId}`)
      .emit('ops:guest_session_closed', {
        sessionId,
        tableId,
        timestamp: new Date(),
      });
  }

  /**
   * Notify staff about guest order converted to real order
   */
  notifyOrderConverted(
    restaurantId: string,
    data: {
      guestOrderId: string;
      orderId: string;
      tableId: string;
      timestamp: Date;
    },
  ): void {
    this.server
      .to(`restaurant:${restaurantId}`)
      .emit('ops:guest_order_converted', data);
  }
}
