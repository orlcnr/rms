import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import type { Request } from 'express';
import { DataSource } from 'typeorm';
import { CreateOrderDto } from './dto/create-order.dto';
import { User } from '../users/entities/user.entity';
import { OrderStatus } from './enums/order-status.enum';
import { DeliveryStatus } from './enums/delivery-status.enum';
import { MoveOrderDto } from './dto/move-order.dto';
import { UpdateOrderItemsDto } from './dto/update-order-items.dto';
import { GetOrdersDto } from './dto/get-orders.dto';
import { OrdersQueryService } from './services/orders-query.service';
import { OrdersCommandService } from './services/orders-command.service';

@Injectable()
export class OrdersService implements OnModuleInit {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly ordersQueryService: OrdersQueryService,
    private readonly ordersCommandService: OrdersCommandService,
    private readonly dataSource: DataSource,
  ) {}

  async onModuleInit(): Promise<void> {
    const rowsUnknown: unknown = await this.dataSource.query(
      `
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'business'
          AND table_name = 'orders'
          AND column_name = 'merged_into'
      ) AS exists
      `,
    );

    const firstRow = Array.isArray(rowsUnknown)
      ? (rowsUnknown[0] as { exists?: boolean } | undefined)
      : undefined;

    if (!firstRow?.exists) {
      this.logger.warn(
        '[orders] business.orders.merged_into column is missing. Move/merge traceability is degraded.',
      );
    }
  }

  async findAll(restaurantId: string, filters: GetOrdersDto) {
    return this.ordersQueryService.findAll(restaurantId, filters);
  }

  async create(createOrderDto: CreateOrderDto, user: User, request?: Request) {
    return this.ordersCommandService.create(createOrderDto, user, request);
  }

  async findAllByRestaurant(restaurantId: string) {
    return this.ordersQueryService.findAllByRestaurant(restaurantId);
  }

  async findOne(id: string) {
    return this.ordersQueryService.findOne(id);
  }

  async updateStatus(
    id: string,
    status: OrderStatus,
    transactionId?: string,
    actor?: User,
    request?: Request,
  ) {
    return this.ordersCommandService.updateStatus(
      id,
      status,
      transactionId,
      actor,
      request,
    );
  }

  async updateDeliveryStatus(
    id: string,
    deliveryStatus: DeliveryStatus,
    actor?: User,
    request?: Request,
  ) {
    return this.ordersCommandService.updateDeliveryStatus(
      id,
      deliveryStatus,
      actor,
      request,
    );
  }

  async batchUpdateStatus(
    orderIds: string[],
    status: OrderStatus,
    transactionId?: string,
    actor?: User,
    request?: Request,
  ) {
    return this.ordersCommandService.batchUpdateStatus(
      orderIds,
      status,
      transactionId,
      actor,
      request,
    );
  }

  async moveOrder(
    orderId: string,
    newTableId: string,
    restaurantId: string,
    onTargetOccupied: MoveOrderDto['on_target_occupied'] = 'reject',
    actor?: User,
    request?: Request,
  ) {
    return this.ordersCommandService.moveOrder(
      orderId,
      newTableId,
      restaurantId,
      onTargetOccupied,
      actor,
      request,
    );
  }

  async updateItems(
    id: string,
    dto: UpdateOrderItemsDto,
    restaurantId: string,
    actor?: User,
    request?: Request,
  ) {
    return this.ordersCommandService.updateItems(
      id,
      dto.items,
      restaurantId,
      dto.notes,
      dto.type,
      dto.customer_id,
      dto.address,
      dto.transaction_id,
      actor,
      request,
    );
  }
}
