import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, QueryRunner } from 'typeorm';

import { Order, OrderStatus } from '../entities/order.entity';
import { Table, TableStatus } from '../../tables/entities/table.entity';
import { NotificationsGateway } from '../../notifications/notifications.gateway';
import { TransactionalHelper } from '../../../common/databases/transactional.helper';

@Injectable()
export class MoveOrderUseCase {
  private readonly logger = new Logger(MoveOrderUseCase.name);

  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(Table)
    private readonly tableRepository: Repository<Table>,
    private readonly notificationsGateway: NotificationsGateway,
    private readonly transactionalHelper: TransactionalHelper,
  ) {}

  async execute(
    orderId: string,
    newTableId: string,
    user: any,
  ): Promise<Order> {
    const result = await this.transactionalHelper.runInTransaction(
      async (queryRunner) => {
        const order = await this.getOrder(
          queryRunner,
          orderId,
          user.restaurantId,
        );
        this.validateOrder(order);

        const newTable = await this.getNewTable(
          queryRunner,
          newTableId,
          user.restaurantId,
        );

        this.validateTableChange(order, newTable);
        await this.ensureTableIsFree(
          queryRunner,
          newTableId,
          user.restaurantId,
        );

        const oldTable = order.table;

        await this.moveOrder(queryRunner, order, newTable.id);
        await this.updateOldTable(queryRunner, oldTable, user.restaurantId);
        await this.updateNewTable(queryRunner, newTable);

        return { order, oldTable, newTable };
      },
    );

    const finalOrder = await this.loadFinalOrder(result.order.id);

    this.sendNotifications(
      user.restaurantId,
      result.oldTable,
      result.newTable,
      finalOrder,
    );

    return finalOrder;
  }

  // ===============================
  // FETCH
  // ===============================

  private async getOrder(
    qr: QueryRunner,
    orderId: string,
    restaurantId: string,
  ): Promise<Order> {
    // 1. Önce sadece siparişi kilitleyerek çekiyoruz (Relation olmadan)
    // Bu, "FOR UPDATE cannot be applied to the nullable side of an outer join" hatasını önler.
    const order = await qr.manager.findOne(Order, {
      where: { id: orderId, restaurantId },
      lock: { mode: 'pessimistic_write' },
    });

    if (!order) {
      throw new NotFoundException('Order not found.');
    }

    // 2. Kilitleme işleminden sonra ilişkiyi manuel yüklüyoruz
    // Bu noktada satır zaten kilitli olduğu için güvenlidir.
    if (order.tableId) {
      const table = await qr.manager.findOne(Table, {
        where: { id: order.tableId },
      });
      if (table) order.table = table;
    }

    return order;
  }

  private async getNewTable(
    qr: QueryRunner,
    tableId: string,
    restaurantId: string,
  ): Promise<Table> {
    const table = await qr.manager.findOne(Table, {
      where: { id: tableId, restaurant_id: restaurantId },
      lock: { mode: 'pessimistic_write' },
    });

    if (!table) {
      throw new NotFoundException('Table not found.');
    }

    if (table.status === TableStatus.OUT_OF_SERVICE) {
      throw new BadRequestException('Target table is out of service.');
    }

    return table;
  }

  // ===============================
  // VALIDATION
  // ===============================

  private validateOrder(order: Order): void {
    if ([OrderStatus.PAID, OrderStatus.CANCELLED].includes(order.status)) {
      throw new BadRequestException(`Order cannot be moved (${order.status}).`);
    }
  }

  private validateTableChange(order: Order, table: Table): void {
    if (order.tableId === table.id) {
      throw new BadRequestException('Order already on this table.');
    }
  }

  private async ensureTableIsFree(
    qr: QueryRunner,
    tableId: string,
    restaurantId: string,
  ): Promise<void> {
    const count = await qr.manager.count(Order, {
      where: {
        tableId,
        restaurantId,
        status: In([
          OrderStatus.PENDING,
          OrderStatus.PREPARING,
          OrderStatus.READY,
          OrderStatus.SERVED,
        ]),
      },
    });

    if (count > 0) {
      throw new ConflictException('Table already has active order.');
    }
  }

  // ===============================
  // DOMAIN ACTIONS
  // ===============================

  private async moveOrder(
    qr: QueryRunner,
    order: Order,
    tableId: string,
  ): Promise<void> {
    // Nesne üzerinden değil, doğrudan tablo üzerinden güncelleme yaparak cache/relation sorunlarını aşıyoruz.
    await qr.manager.update(Order, order.id, {
      tableId: tableId,
    });

    // Bellekteki objeyi de güncel tutalım (sonraki adımlar için)
    order.tableId = tableId;
    console.log(
      `[MOVE-CASE] Sipariş ${order.id} için table_id ${tableId} olarak güncellendi.`,
    );
  }

  private async updateOldTable(
    qr: QueryRunner,
    table: Table | null,
    restaurantId: string,
  ): Promise<void> {
    if (!table) return;

    const remaining = await qr.manager.count(Order, {
      where: {
        tableId: table.id,
        restaurantId,
        status: In([
          OrderStatus.PENDING,
          OrderStatus.PREPARING,
          OrderStatus.READY,
          OrderStatus.SERVED,
        ]),
      },
    });

    if (remaining === 0 && table.status !== TableStatus.AVAILABLE) {
      table.status = TableStatus.AVAILABLE;
      await qr.manager.save(table);
    }
  }

  private async updateNewTable(qr: QueryRunner, table: Table): Promise<void> {
    if (table.status !== TableStatus.OCCUPIED) {
      table.status = TableStatus.OCCUPIED;
      await qr.manager.save(table);
    }
  }

  // ===============================
  // POST TRANSACTION
  // ===============================

  private sendNotifications(
    restaurantId: string,
    oldTable: Table | null,
    newTable: Table,
    order: Order,
  ): void {
    if (oldTable) {
      this.notificationsGateway.notifyOrderStatus(restaurantId, oldTable);
    }

    this.notificationsGateway.notifyOrderStatus(restaurantId, newTable);

    this.notificationsGateway.notifyOrderStatus(restaurantId, order);
  }

  private async loadFinalOrder(orderId: string): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
      relations: ['items', 'items.menuItem', 'table', 'user'],
    });

    if (!order) {
      throw new NotFoundException('Order not found after move.');
    }

    return order;
  }
}
