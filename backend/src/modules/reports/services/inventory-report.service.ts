import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { differenceInDays } from 'date-fns';
import { Stock } from '../../inventory/entities/stock.entity';
import {
  StockMovement,
  MovementType,
} from '../../inventory/entities/stock-movement.entity';
import { Ingredient } from '../../inventory/entities/ingredient.entity';
import { DateRangeDto } from '../dto/date-range.dto';

@Injectable()
export class InventoryReportService {
  constructor(
    @InjectRepository(Stock)
    private readonly stockRepository: Repository<Stock>,
    @InjectRepository(StockMovement)
    private readonly movementRepository: Repository<StockMovement>,
    @InjectRepository(Ingredient)
    private readonly ingredientRepository: Repository<Ingredient>,
  ) {}

  private validateParams(
    restaurantId: string | null,
    start?: Date,
    end?: Date,
  ) {
    if (!restaurantId) {
      throw new UnauthorizedException(
        'Bir restorana atanmış olmanız gerekmektedir.',
      );
    }

    if (start && end) {
      const days = Math.abs(differenceInDays(end, start));
      if (days > 31) {
        throw new BadRequestException('Rapor süresi maksimum 31 gün olabilir.');
      }
    }
  }

  async getStockStatus(restaurantId: string | null) {
    this.validateParams(restaurantId);

    const ingredients = await this.ingredientRepository
      .createQueryBuilder('ingredient')
      .leftJoinAndSelect('ingredient.stock', 'stock')
      .where('ingredient.restaurant_id = :restaurantId', { restaurantId })
      .orderBy('ingredient.name', 'ASC')
      .getMany();

    return ingredients.map((ing) => ({
      id: ing.id,
      name: ing.name,
      unit: ing.unit,
      current_quantity: parseFloat(ing.stock?.quantity?.toString() || '0'),
      critical_level: parseFloat(ing.critical_level?.toString() || '0'),
      is_critical:
        parseFloat(ing.stock?.quantity?.toString() || '0') <=
        parseFloat(ing.critical_level?.toString() || '0'),
    }));
  }

  async getStockMovements(restaurantId: string | null, query: DateRangeDto) {
    const { start_date, end_date } = query;
    const start = start_date
      ? new Date(start_date)
      : new Date(new Date().setDate(new Date().getDate() - 7));
    const end = end_date ? new Date(end_date) : new Date();
    if (end_date) {
      end.setHours(23, 59, 59, 999);
    }

    this.validateParams(restaurantId, start, end);

    const results = await this.movementRepository
      .createQueryBuilder('movement')
      .leftJoin('movement.ingredient', 'ingredient')
      .select('ingredient.name', 'ingredient_name')
      .addSelect('movement.type', 'type')
      .addSelect('SUM(movement.quantity)', 'total_quantity')
      .where('ingredient.restaurant_id = :restaurantId', { restaurantId })
      .andWhere('movement.created_at BETWEEN :start AND :end', { start, end })
      .groupBy('ingredient.name')
      .addGroupBy('movement.type')
      .getRawMany();

    return results.map((row) => ({
      ingredient_name: row.ingredient_name,
      type: row.type,
      total_quantity: parseFloat(row.total_quantity || 0),
    }));
  }

  async getWastageReport(restaurantId: string | null, query: DateRangeDto) {
    const { start_date, end_date } = query;
    const start = start_date
      ? new Date(start_date)
      : new Date(new Date().setDate(new Date().getDate() - 30));
    const end = end_date ? new Date(end_date) : new Date();
    if (end_date) {
      end.setHours(23, 59, 59, 999);
    }

    this.validateParams(restaurantId, start, end);

    const results = await this.movementRepository
      .createQueryBuilder('movement')
      .leftJoin('movement.ingredient', 'ingredient')
      .select('ingredient.name', 'ingredient_name')
      .addSelect('ingredient.unit', 'unit')
      .addSelect('SUM(movement.quantity)', 'total_wastage')
      .addSelect('COUNT(movement.id)', 'incident_count')
      .where('ingredient.restaurant_id = :restaurantId', { restaurantId })
      .andWhere('movement.type = :type', { type: MovementType.OUT })
      .andWhere('movement.reason = :reason', { reason: 'WASTE' })
      .andWhere('movement.created_at BETWEEN :start AND :end', { start, end })
      .groupBy('ingredient.name')
      .addGroupBy('ingredient.unit')
      .orderBy('total_wastage', 'DESC')
      .getRawMany();

    return results.map((row) => ({
      ingredient_name: row.ingredient_name,
      unit: row.unit,
      total_wastage: parseFloat(row.total_wastage || 0),
      incident_count: parseInt(row.incident_count),
    }));
  }
}
