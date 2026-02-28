import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import {
  Order,
  OrderStatus,
  OrderType,
  OrderSource,
} from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { MenuItem } from '../menus/entities/menu-item.entity';
import { Table, TableStatus } from '../tables/entities/table.entity';
import { MoveOrderUseCase } from './use-cases/move-order.use-case';
import { RulesService } from '../rules/rules.service';
import { RuleKey } from '../rules/enums/rule-key.enum';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private ordersRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private orderItemsRepository: Repository<OrderItem>,
    private readonly dataSource: DataSource,
    private notificationsGateway: NotificationsGateway,
    private readonly moveOrderUseCase: MoveOrderUseCase,
    private readonly rulesService: RulesService,
  ) {}

  async findAll(
    user: any,
    status?: string,
    waiterId?: string,
    type?: string,
    tableId?: string,
  ): Promise<Order[]> {
    const restaurantId = user.restaurantId;
    if (!restaurantId && user.role !== 'super_admin') {
      return [];
    }

    const where: any = {};
    if (user.role !== 'super_admin') {
      where.restaurantId = restaurantId;
    }

    if (status) {
      const statuses = status
        .split(',')
        .filter((s) => s.trim() !== '') as OrderStatus[];
      if (statuses.length > 0) {
        where.status = In(statuses);
      }
    }

    if (waiterId) {
      where.userId = waiterId;
    }

    if (type) {
      const types = type
        .split(',')
        .filter((t) => t.trim() !== '') as OrderType[];
      if (types.length > 0) {
        where.type = In(types);
      }
    }

    if (tableId) {
      where.tableId = tableId;
    }

    const orders = await this.ordersRepository.find({
      where,
      relations: ['items', 'items.menuItem', 'table', 'user', 'customer'],
      order: { created_at: 'DESC' } as any,
    });

    return orders;
  }

  async create(createOrderDto: CreateOrderDto, user: any): Promise<Order> {
    const {
      restaurant_id,
      table_id,
      items,
      notes,
      type,
      source,
      external_id,
      customer_id,
      address,
      delivery_fee,
      integration_metadata,
      transaction_id,
    } = createOrderDto;

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const order = queryRunner.manager.create(Order, {
        restaurantId: restaurant_id,
        tableId: table_id || null,
        userId: user ? user.id : null,
        notes: notes || null,
        status: OrderStatus.PENDING,
        totalAmount: 0,
        orderNumber: `ORD-${Date.now().toString().slice(-6)}`,
        type: type || OrderType.DINE_IN,
        source: source || OrderSource.INTERNAL,
        externalId: external_id || null,
        customerId: customer_id || null,
        address: address || null,
        deliveryFee: delivery_fee || 0,
        integrationMetadata: integration_metadata || null,
      });

      // Business Rule Check: Masa Seçimi Zorunluluğu (Sadece DINE_IN için)
      if (order.type === OrderType.DINE_IN) {
        await this.rulesService.checkRule(
          restaurant_id,
          RuleKey.ORDER_MANDATORY_TABLE,
          table_id, // Pass table_id as context
          'Bu sipariş için masa seçilmesi zorunludur.',
        );
      }

      // Check if there's already an active order for this table
      if (table_id) {
        const activeOrder = await queryRunner.manager.findOne(Order, {
          where: {
            tableId: table_id,
            status: In([
              OrderStatus.PENDING,
              OrderStatus.PREPARING,
              OrderStatus.READY,
              OrderStatus.SERVED,
            ]),
          },
        });

        if (activeOrder) {
          throw new BadRequestException(
            'Bu masada zaten açık bir sipariş var. Lütfen mevcut siparişi güncelleyin.',
          );
        }

        // Masa durumunu güncelle
        const table = await queryRunner.manager.findOne(Table, {
          where: { id: table_id },
          lock: { mode: 'pessimistic_write' },
        });
        if (table && table.status !== TableStatus.OCCUPIED) {
          table.status = TableStatus.OCCUPIED;
          await queryRunner.manager.save(table);
        }
      }

      const savedOrder = await queryRunner.manager.save(order);

      let totalAmount = 0;
      for (const itemDto of items) {
        const menuItem = await queryRunner.manager.findOne(MenuItem, {
          where: { id: itemDto.menu_item_id },
        });
        if (!menuItem) {
          throw new NotFoundException(
            `Menu item with ID ${itemDto.menu_item_id} not found`,
          );
        }

        const subtotal = menuItem.price * itemDto.quantity;
        totalAmount += subtotal;

        const orderItem = queryRunner.manager.create(OrderItem, {
          orderId: savedOrder.id,
          menuItemId: menuItem.id,
          quantity: itemDto.quantity,
          unitPrice: menuItem.price,
          totalPrice: subtotal,
        });
        await queryRunner.manager.save(orderItem);
      }

      savedOrder.totalAmount = totalAmount;
      await queryRunner.manager.save(savedOrder);

      await queryRunner.commitTransaction();

      const finalOrder = await this.findOne(savedOrder.id);
      this.notificationsGateway.notifyNewOrder(
        restaurant_id,
        finalOrder,
        transaction_id,
      );

      return finalOrder;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async findOne(id: string): Promise<Order> {
    const order = await this.ordersRepository.findOne({
      where: { id },
      relations: ['items', 'items.menuItem', 'table', 'user', 'customer'],
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }
    return order;
  }

  async updateStatus(id: string, status: OrderStatus): Promise<Order> {
    const order = await this.findOne(id);

    // Business Rule Check: Onaylı Sipariş İptal Kısıtı
    if (status === OrderStatus.CANCELLED) {
      await this.rulesService.checkRule(
        order.restaurantId,
        RuleKey.ORDER_PREVENT_VOID,
        order, // Pass order object as context
        'Hazırlık aşamasına geçmiş siparişler iptal edilemez. Lütfen yöneticiye danışın.',
      );
    }

    order.status = status;

    // Update all mutable items to match order status using query builder
    if (order.items && order.items.length > 0) {
      try {
        const itemIds = order.items
          .filter(
            (item) =>
              item.status !== OrderStatus.SERVED &&
              item.status !== OrderStatus.DELIVERED &&
              item.status !== OrderStatus.PAID &&
              item.status !== OrderStatus.CANCELLED,
          )
          .map((item) => item.id);
        if (itemIds.length > 0) {
          await this.orderItemsRepository
            .createQueryBuilder()
            .update()
            .set({ status: status })
            .where('id IN (:...itemIds)', { itemIds })
            .execute();
        }
      } catch (itemError) {
        // Log but continue - order status update is more important
        console.error('Failed to update order items:', itemError);
      }
    }

    const updatedOrder = await this.ordersRepository.save(order);

    // Eğer sipariş ödendi veya iptal edildiyse, masa durumunu kontrol et
    if (
      order.tableId &&
      (status === OrderStatus.PAID || status === OrderStatus.CANCELLED)
    ) {
      const activeOrdersCount = await this.ordersRepository.count({
        where: {
          tableId: order.tableId,
          restaurantId: order.restaurantId,
          status: In([
            OrderStatus.PENDING,
            OrderStatus.PREPARING,
            OrderStatus.READY,
            OrderStatus.SERVED,
          ]),
        },
      });

      if (activeOrdersCount === 0) {
        const table = await this.dataSource
          .getRepository(Table)
          .findOneBy({ id: order.tableId });
        if (table && table.status === TableStatus.OCCUPIED) {
          table.status = TableStatus.AVAILABLE;
          await this.dataSource.getRepository(Table).save(table);

          // Masa durumu güncellendi bildirimi gönder
          this.notificationsGateway.notifyOrderStatus(
            order.restaurantId,
            table,
          );
        }
      }
    }

    this.notificationsGateway.notifyOrderStatus(
      order.restaurantId,
      updatedOrder,
    );
    return updatedOrder;
  }

  async batchUpdateStatus(
    orderIds: string[],
    status: OrderStatus,
  ): Promise<Order[]> {
    if (!orderIds.length) return [];

    // Fetch all orders in one query
    const orders = await this.ordersRepository.find({
      where: { id: In(orderIds) },
      relations: ['items', 'table', 'user', 'customer'],
    });

    if (!orders.length) return [];

    // --- Business rule: cancel restriction ---
    if (status === OrderStatus.CANCELLED) {
      for (const order of orders) {
        await this.rulesService.checkRule(
          order.restaurantId,
          RuleKey.ORDER_PREVENT_VOID,
          order,
          'Hazırlık aşamasına geçmiş siparişler iptal edilemez.',
        );
      }
    }

    // --- Bulk update order statuses ---
    await this.ordersRepository
      .createQueryBuilder()
      .update()
      .set({ status })
      .where('id IN (:...orderIds)', { orderIds })
      .execute();

    // --- Bulk update order item statuses ---
    const allItemIds = orders.flatMap(
      (o) =>
        o.items
          ?.filter(
            (i) =>
              i.status !== OrderStatus.SERVED &&
              i.status !== OrderStatus.DELIVERED &&
              i.status !== OrderStatus.PAID &&
              i.status !== OrderStatus.CANCELLED,
          )
          .map((i) => i.id) ?? [],
    );
    if (allItemIds.length > 0) {
      await this.orderItemsRepository
        .createQueryBuilder()
        .update()
        .set({ status })
        .where('id IN (:...allItemIds)', { allItemIds })
        .execute();
    }

    // --- Handle table status for terminal statuses (PAID / CANCELLED) ---
    if (status === OrderStatus.PAID || status === OrderStatus.CANCELLED) {
      // Collect unique tableIds
      const tableIds = [
        ...new Set(orders.map((o) => o.tableId).filter(Boolean) as string[]),
      ];
      const restaurantId = orders[0].restaurantId;

      for (const tableId of tableIds) {
        const activeCount = await this.ordersRepository.count({
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

        if (activeCount === 0) {
          const table = await this.dataSource
            .getRepository(Table)
            .findOneBy({ id: tableId });
          if (table && table.status === TableStatus.OCCUPIED) {
            table.status = TableStatus.AVAILABLE;
            await this.dataSource.getRepository(Table).save(table);
            this.notificationsGateway.notifyOrderStatus(restaurantId, table);
          }
        }
      }
    }

    // --- Fetch updated orders and emit notifications ---
    const updatedOrders = await this.ordersRepository.find({
      where: { id: In(orderIds) },
      relations: ['items', 'items.menuItem', 'table', 'user', 'customer'],
    });

    const restaurantId = updatedOrders[0]?.restaurantId;
    if (restaurantId) {
      // Single notification per update batch (not per order)
      updatedOrders.forEach((o) =>
        this.notificationsGateway.notifyOrderStatus(restaurantId, o),
      );
    }

    return updatedOrders;
  }

  async updateItems(
    orderId: string,
    items: { menu_item_id: string; quantity: number }[],
    user: any,
    notes?: string,
    type?: OrderType,
    customer_id?: string,
    address?: string,
    transaction_id?: string,
  ): Promise<Order> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const order = await queryRunner.manager.findOne(Order, {
        where: { id: orderId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!order) {
        throw new NotFoundException(`Order with ID ${orderId} not found`);
      }

      if (order.status === 'paid' || order.status === 'cancelled') {
        throw new BadRequestException('Order cannot be modified');
      }

      if (notes !== undefined) {
        order.notes = notes;
      }

      if (type !== undefined) {
        order.type = type;
      }

      if (customer_id !== undefined) {
        order.customerId = customer_id;
      }

      if (address !== undefined) {
        order.address = address;
      }

      const validItems = items.filter((i) => i.quantity > 0);
      if (!validItems.length) {
        throw new BadRequestException('No valid items provided');
      }

      const menuItemIds = [
        ...new Set([
          ...validItems.map((i) => i.menu_item_id),
          ...(order.items?.map((i) => i.menuItemId) || []),
        ]),
      ];

      const menuItems = await queryRunner.manager.find(MenuItem, {
        where: { id: In(menuItemIds) },
      });

      const menuItemMap = new Map(menuItems.map((i) => [i.id, i]));

      if (menuItems.length === 0 && validItems.length > 0) {
        throw new NotFoundException('One or more menu items not found');
      }

      // 1. Get existing items
      const existingItems = await queryRunner.manager.find(OrderItem, {
        where: { orderId },
      });

      // 3. Separate items into frozen (SERVED/READY) and mutable (PENDING/PREPARING)
      const frozenItems = existingItems.filter(
        (i) =>
          i.status === OrderStatus.SERVED || i.status === OrderStatus.READY,
      );
      const mutableItems = existingItems.filter(
        (i) =>
          i.status !== OrderStatus.SERVED && i.status !== OrderStatus.READY,
      );

      // Group requested items by menu_item_id
      const requestedItemsMap = new Map<string, number>();
      validItems.forEach((i) => {
        requestedItemsMap.set(i.menu_item_id, i.quantity);
      });

      // Track all menu IDs involved
      const allMenuIds = new Set([
        ...requestedItemsMap.keys(),
        ...existingItems.map((i) => i.menuItemId),
      ]);

      let hasNewOrChangedItems = false;
      let totalAmount = 0;

      for (const menuItemId of allMenuIds) {
        const menuItem = menuItemMap.get(menuItemId);
        const targetQty = requestedItemsMap.get(menuItemId) || 0;

        const currentItemsForProduct = existingItems.filter(
          (i) => i.menuItemId === menuItemId,
        );
        const currentTotalQty = currentItemsForProduct.reduce(
          (sum, i) => sum + i.quantity,
          0,
        );

        const delta = targetQty - currentTotalQty;

        if (delta > 0) {
          // ADDITION: Create a new row for the difference
          if (!menuItem)
            throw new NotFoundException(`Menu item ${menuItemId} not found`);

          const newItem = queryRunner.manager.create(OrderItem, {
            orderId,
            menuItemId,
            quantity: delta,
            unitPrice: menuItem.price,
            totalPrice: menuItem.price * delta,
            status: OrderStatus.PENDING,
          });
          await queryRunner.manager.save(newItem);
          hasNewOrChangedItems = true;
        } else if (delta < 0) {
          // REDUCTION: Reduce or delete latest mutable rows
          let toRemove = Math.abs(delta);
          const mutableForProduct = currentItemsForProduct
            .filter(
              (i) =>
                i.status !== OrderStatus.SERVED &&
                i.status !== OrderStatus.READY,
            )
            .sort(
              (a, b) =>
                new Date(b.created_at).getTime() -
                new Date(a.created_at).getTime(),
            );

          for (const item of mutableForProduct) {
            if (toRemove <= 0) break;

            if (item.quantity <= toRemove) {
              toRemove -= item.quantity;
              await queryRunner.manager.remove(item);
            } else {
              item.quantity -= toRemove;
              item.totalPrice = Number(item.unitPrice) * item.quantity;
              await queryRunner.manager.save(item);
              toRemove = 0;
            }
            hasNewOrChangedItems = true;
          }
        }
      }

      // Re-calculate total amount from all items currently in DB for this order
      const finalItems = await queryRunner.manager.find(OrderItem, {
        where: { orderId },
      });
      totalAmount = finalItems.reduce(
        (sum, i) => sum + Number(i.totalPrice),
        0,
      );

      // 4. Reset order status if new items were added to a completed order
      if (
        hasNewOrChangedItems &&
        (order.status === OrderStatus.SERVED ||
          order.status === OrderStatus.READY)
      ) {
        order.status = OrderStatus.PENDING;
        // Reset item statuses that were READY to PENDING?
        // Actually the user said "yeni item eklenirse eski siparişe tkrar bekleyen siparişlere çekilsin"
      }

      order.totalAmount = totalAmount;
      await queryRunner.manager.save(order);

      await queryRunner.commitTransaction();

      const finalOrder = await this.findOne(orderId);
      console.log(
        `[updateItems] Notifying for order ${finalOrder.id}, tableId: ${finalOrder.tableId}, restaurantId: ${finalOrder.restaurantId}`,
      );
      this.notificationsGateway.notifyOrderStatus(
        order.restaurantId,
        finalOrder,
        transaction_id,
      );

      // Sipariş güncellendi (fiyat değişti vb.) - ödeme ekranını bilgilendir
      this.notificationsGateway.notifyOrderUpdated(
        order.restaurantId,
        finalOrder,
      );

      return finalOrder;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async findAllByRestaurant(restaurantId: string, user: any): Promise<Order[]> {
    if (user.role === 'super_admin') {
      return this.ordersRepository.find({
        where: { restaurantId: restaurantId },
        relations: ['items', 'items.menuItem', 'table', 'user', 'customer'],
        order: { created_at: 'DESC' } as any,
      });
    }

    if (user.restaurantId !== restaurantId) {
      throw new NotFoundException('Bu restorana erişim yetkiniz yok');
    }

    return this.ordersRepository.find({
      where: { restaurantId: user.restaurantId },
      relations: ['items', 'items.menuItem', 'table', 'user', 'customer'],
      order: { created_at: 'DESC' } as any,
    });
  }

  async moveOrder(
    orderId: string,
    newTableId: string,
    user: any,
  ): Promise<Order> {
    return this.moveOrderUseCase.execute(orderId, newTableId, user);
  }
}
