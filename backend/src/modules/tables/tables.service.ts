import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Table, TableStatus } from './entities/table.entity';
import { Area } from './entities/area.entity';
import { CreateTableDto } from './dto/create-table.dto';
import { CreateAreaDto } from './dto/create-area.dto';
import { ReservationStatus } from '../reservations/entities/reservation.entity';
import { Order, OrderStatus } from '../orders/entities/order.entity';

@Injectable()
export class TablesService {
  constructor(
    @InjectRepository(Table)
    private readonly tableRepository: Repository<Table>,
    @InjectRepository(Area)
    private readonly areaRepository: Repository<Area>,
  ) {}

  // Area Methods
  async createArea(createAreaDto: CreateAreaDto): Promise<Area> {
    const area = this.areaRepository.create(createAreaDto);
    return this.areaRepository.save(area);
  }

  async findAllAreasByRestaurant(restaurantId: string): Promise<Area[]> {
    return this.areaRepository.find({
      where: { restaurant_id: restaurantId },
      relations: ['tables'],
    });
  }

  async updateArea(
    id: string,
    updateAreaDto: Partial<CreateAreaDto>,
  ): Promise<Area | null> {
    await this.areaRepository.update(id, updateAreaDto);
    return this.areaRepository.findOneBy({ id });
  }

  async deleteArea(id: string): Promise<void> {
    await this.areaRepository.delete(id);
  }

  // Table Methods
  async createTable(createTableDto: CreateTableDto): Promise<Table> {
    const table = this.tableRepository.create(createTableDto);
    return this.tableRepository.save(table);
  }

  async findAllTablesByRestaurant(restaurantId: string): Promise<Table[]> {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const tables = await this.tableRepository
      .createQueryBuilder('table')
      .leftJoinAndSelect('table.area', 'area')
      .leftJoinAndSelect(
        'table.reservations',
        'reservation',
        'reservation.status IN (:...statuses) AND reservation.reservation_time >= :startOfToday',
        {
          statuses: [ReservationStatus.PENDING, ReservationStatus.CONFIRMED],
          startOfToday,
        },
      )
      .leftJoinAndSelect('reservation.customer', 'customer')
      .where('table.restaurant_id = :restaurantId', { restaurantId })
      .orderBy('table.name', 'ASC')
      .addOrderBy('reservation.reservation_time', 'ASC')
      .getMany();

    // Aktif siparişi olan masaların bilgilerini çek
    const activeOrdersQuery = `
      SELECT o.id as order_id, o.table_id, o.order_number, 
             o.total_amount, o.created_at
      FROM business.orders o
      WHERE o.restaurant_id = $1 
        AND o.status IN ('pending', 'preparing', 'ready', 'served')
        AND o.table_id IS NOT NULL
    `;

    const activeOrders = await this.tableRepository.manager.query(
      activeOrdersQuery,
      [restaurantId],
    );

    // Map orders by table_id for easy lookup
    const ordersByTableId = new Map<string, any>();
    activeOrders.forEach((o: any) => {
      if (!ordersByTableId.has(o.table_id)) {
        ordersByTableId.set(o.table_id, o);
      }
    });

    return tables.map((table) => {
      const activeOrder = ordersByTableId.get(table.id);

      // Eğer masanın aktif bir siparişi VARSA ama durumu 'available' ise, onu 'occupied' göster.
      if (activeOrder) {
        table.status = TableStatus.OCCUPIED;
        // active_order bilgisini ekle
        (table as any).active_order = {
          id: activeOrder.order_id,
          order_number: activeOrder.order_number,
          total_price: parseFloat(activeOrder.total_amount) || 0,
          created_at: activeOrder.created_at,
        };
      }
      // Eğer masanın aktif bir siparişi YOKSA ama durumu 'occupied' ise, onu 'available' göster.
      else if (table.status === TableStatus.OCCUPIED) {
        table.status = TableStatus.AVAILABLE;
      }
      return table;
    });
  }

  async findOne(id: string): Promise<Table | null> {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    return this.tableRepository
      .createQueryBuilder('table')
      .leftJoinAndSelect('table.area', 'area')
      .leftJoinAndSelect(
        'table.reservations',
        'reservation',
        'reservation.status IN (:...statuses) AND reservation.reservation_time >= :startOfToday',
        {
          statuses: [ReservationStatus.PENDING, ReservationStatus.CONFIRMED],
          startOfToday,
        },
      )
      .leftJoinAndSelect('reservation.customer', 'customer')
      .where('table.id = :id', { id })
      .orderBy('reservation.reservation_time', 'ASC')
      .getOne();
  }

  async updateTableStatus(id: string, status: TableStatus): Promise<Table> {
    const table = await this.tableRepository.findOneBy({ id });
    if (!table) throw new Error('Table not found');
    table.status = status;
    return this.tableRepository.save(table);
  }

  async updateTable(
    id: string,
    updateTableDto: Partial<CreateTableDto>,
  ): Promise<Table | null> {
    await this.tableRepository.update(id, updateTableDto);
    return this.tableRepository.findOneBy({ id });
  }

  async deleteTable(id: string): Promise<void> {
    await this.tableRepository.delete(id);
  }

  /**
   * Checks if there are any open (occupied) tables in the restaurant.
   */
  async hasOpenTables(restaurantId: string): Promise<boolean> {
    const occupiedTables = await this.findAllTablesByRestaurant(restaurantId);
    return occupiedTables.some((t) => t.status === TableStatus.OCCUPIED);
  }
}
