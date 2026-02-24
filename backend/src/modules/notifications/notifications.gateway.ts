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
  notifyNewOrder(restaurantId: string, order: any) {
    this.logger.log(`[notifyNewOrder] Sending to room: ${restaurantId}, order id: ${order?.id}`);
    this.server.to(restaurantId).emit('new_order', order);
    this.logger.log(`Notification sent to room ${restaurantId}: new_order`);
  }

  notifyOrderStatus(restaurantId: string, order: any) {
    this.logger.log(`[notifyOrderStatus] Sending to room: ${restaurantId}, order id: ${order?.id}, table_id: ${order?.tableId}, items count: ${order?.items?.length || 0}`);
    this.server.to(restaurantId).emit('order_status_updated', order);
    this.logger.log(
      `Notification sent to room ${restaurantId}: order_status_updated`,
    );
  }

  // Sipariş güncellendiğinde (ürün eklendi, fiyat değişti vb.)
  notifyOrderUpdated(restaurantId: string, order: any) {
    this.logger.log(`[notifyOrderUpdated] Sending to room: ${restaurantId}, order id: ${order?.id}, totalAmount: ${order?.totalAmount}`);
    this.server.to(restaurantId).emit('order:updated', {
      orderId: order?.id,
      totalAmount: order?.totalAmount,
      status: order?.status,
      updatedAt: new Date().toISOString(),
    });
    this.logger.log(
      `Notification sent to room ${restaurantId}: order:updated`,
    );
  }
}
