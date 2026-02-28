import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class NotificationsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private logger: Logger = new Logger('NotificationsGateway');

  constructor() {
    this.logger.log('NotificationsGateway constructed (root namespace)');
  }

  handleConnection(client: Socket, ...args: any[]) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join_room')
  handleJoinRoom(
    @MessageBody() data: { restaurant_id: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.join(data.restaurant_id);
    this.logger.log(`Client ${client.id} joined room ${data.restaurant_id}`);
    return { event: 'joined_room', data: data.restaurant_id };
  }

  @SubscribeMessage('leave_room')
  handleLeaveRoom(
    @MessageBody() data: { restaurant_id: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.leave(data.restaurant_id);
    this.logger.log(`Client ${client.id} left room ${data.restaurant_id}`);
    return { event: 'left_room', data: data.restaurant_id };
  }

  // Public method to be called by services
  notifyNewOrder(restaurantId: string, order: any, transactionId?: string) {
    this.logger.log(
      `[notifyNewOrder] Sending to room: ${restaurantId}, order id: ${order?.id}, transaction_id: ${transactionId}`,
    );
    const payload = {
      ...order,
      ...(transactionId && { transaction_id: transactionId }),
    };
    this.server.to(restaurantId).emit('new_order', payload);
    this.logger.log(`Notification sent to room ${restaurantId}: new_order`);
  }

  notifyOrderStatus(restaurantId: string, order: any, transactionId?: string) {
    this.logger.log(
      `[notifyOrderStatus] Sending to room: ${restaurantId}, order id: ${order?.id}, table_id: ${order?.tableId}, transaction_id: ${transactionId}`,
    );
    const payload = {
      ...order,
      ...(transactionId && { transaction_id: transactionId }),
    };
    this.server.to(restaurantId).emit('order_status_updated', payload);
    this.logger.log(
      `Notification sent to room ${restaurantId}: order_status_updated`,
    );
  }

  // Sipariş güncellendiğinde (ürün eklendi, fiyat değişti vb.)
  notifyOrderUpdated(restaurantId: string, order: any) {
    this.logger.log(
      `[notifyOrderUpdated] Sending to room: ${restaurantId}, order id: ${order?.id}, totalAmount: ${order?.totalAmount}`,
    );
    this.server.to(restaurantId).emit('order:updated', {
      orderId: order?.id,
      totalAmount: order?.totalAmount,
      status: order?.status,
      updatedAt: new Date().toISOString(),
    });
    this.logger.log(`Notification sent to room ${restaurantId}: order:updated`);
  }

  // Kasa işlemleri (oturum açma/kapama)
  notifyCashSessionUpdate(restaurantId: string, data: any) {
    this.logger.log(
      `[notifyCashSessionUpdate] Sending to room: ${restaurantId}`,
    );
    this.server.to(restaurantId).emit('cash:session_updated', data);
  }

  // Kasa hareketi (para girişi/çıkışı/satış)
  notifyCashMovement(restaurantId: string, data: any) {
    this.logger.log(`[notifyCashMovement] Sending to room: ${restaurantId}`);
    this.server.to(restaurantId).emit('cash:movement_added', data);
  }
}
