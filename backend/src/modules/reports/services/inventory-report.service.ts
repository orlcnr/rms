import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { differenceInDays } from 'date-fns';
import { Stock } from '../../inventory/entities/stock.entity';
import { BranchStock } from '../../inventory/entities/branch-stock.entity';
import {
  StockMovement,
  MovementType,
} from '../../inventory/entities/stock-movement.entity';
import { Ingredient } from '../../inventory/entities/ingredient.entity';
import { Restaurant } from '../../restaurants/entities/restaurant.entity';
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
    @InjectRepository(Restaurant)
    private readonly restaurantRepository: Repository<Restaurant>,
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

  private async resolveRestaurantScope(restaurantId: string): Promise<{
    restaurantId: string;
    brandId: string | null;
  }> {
    const restaurant = await this.restaurantRepository.findOne({
      where: { id: restaurantId },
      select: ['id', 'brand_id'],
    });

    if (!restaurant) {
      throw new UnauthorizedException('Restoran bulunamadı.');
    }

    return {
      restaurantId: restaurant.id,
      brandId: restaurant.brand_id || null,
    };
  }

  async getStockStatus(restaurantId: string | null) {
    this.validateParams(restaurantId);
    const { brandId } = await this.resolveRestaurantScope(restaurantId!);

    const quantityExpr = brandId
      ? 'COALESCE(branch_stock.quantity, 0)'
      : 'COALESCE(branch_stock.quantity, COALESCE(stock.quantity, 0))';

    const query = this.ingredientRepository
      .createQueryBuilder('ingredient')
      .leftJoin('ingredient.stock', 'stock')
      .leftJoin(
        BranchStock,
        'branch_stock',
        'branch_stock.ingredient_id = ingredient.id AND branch_stock.branch_id = :restaurantId',
        { restaurantId },
      )
      .select('ingredient.id', 'id')
      .addSelect('ingredient.name', 'name')
      .addSelect('ingredient.unit', 'unit')
      .addSelect('ingredient.critical_level', 'critical_level')
      .addSelect(quantityExpr, 'current_quantity')
      .orderBy('ingredient.name', 'ASC');

    if (brandId) {
      query.where('ingredient.brand_id = :brandId', { brandId });
    } else {
      query.where('ingredient.restaurant_id = :restaurantId', { restaurantId });
    }

    const rows = await query.getRawMany<{
      id: string;
      name: string;
      unit: string;
      critical_level: string;
      current_quantity: string;
    }>();

    return rows.map((row) => {
      const currentQuantity = Number(row.current_quantity || 0);
      const criticalLevel = Number(row.critical_level || 0);

      return {
        id: row.id,
        name: row.name,
        unit: row.unit,
        current_quantity: currentQuantity,
        critical_level: criticalLevel,
        is_critical: currentQuantity <= criticalLevel,
      };
    });
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
    const { brandId } = await this.resolveRestaurantScope(restaurantId!);

    const movementQuery = this.movementRepository
      .createQueryBuilder('movement')
      .leftJoin('movement.ingredient', 'ingredient')
      .select('ingredient.name', 'ingredient_name')
      .addSelect('movement.type', 'type')
      .addSelect('SUM(movement.quantity)', 'total_quantity')
      .where('movement.branch_id = :restaurantId', { restaurantId })
      .andWhere('movement.created_at BETWEEN :start AND :end', { start, end })
      .groupBy('ingredient.name')
      .addGroupBy('movement.type');

    if (brandId) {
      movementQuery.andWhere('ingredient.brand_id = :brandId', { brandId });
    } else {
      movementQuery.andWhere('ingredient.restaurant_id = :restaurantId', {
        restaurantId,
      });
    }

    const results = await movementQuery.getRawMany<{
      ingredient_name: string;
      type: MovementType;
      total_quantity: string;
    }>();

    return results.map((row) => ({
      ingredient_name: row.ingredient_name,
      type: row.type,
      total_quantity: Number.parseFloat(row.total_quantity || '0'),
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
    const { brandId } = await this.resolveRestaurantScope(restaurantId!);

    const wastageQuery = this.movementRepository
      .createQueryBuilder('movement')
      .leftJoin('movement.ingredient', 'ingredient')
      .select('ingredient.name', 'ingredient_name')
      .addSelect('ingredient.unit', 'unit')
      .addSelect('SUM(movement.quantity)', 'total_wastage')
      .addSelect('COUNT(movement.id)', 'incident_count')
      .where('movement.branch_id = :restaurantId', { restaurantId })
      .andWhere('movement.type = :type', { type: MovementType.OUT })
      .andWhere('movement.reason = :reason', { reason: 'WASTE' })
      .andWhere('movement.created_at BETWEEN :start AND :end', { start, end })
      .groupBy('ingredient.name')
      .addGroupBy('ingredient.unit')
      .orderBy('total_wastage', 'DESC');

    if (brandId) {
      wastageQuery.andWhere('ingredient.brand_id = :brandId', { brandId });
    } else {
      wastageQuery.andWhere('ingredient.restaurant_id = :restaurantId', {
        restaurantId,
      });
    }

    const results = await wastageQuery.getRawMany<{
      ingredient_name: string;
      unit: string;
      total_wastage: string;
      incident_count: string;
    }>();

    return results.map((row) => ({
      ingredient_name: row.ingredient_name,
      unit: row.unit,
      total_wastage: Number.parseFloat(row.total_wastage || '0'),
      incident_count: Number.parseInt(row.incident_count, 10),
    }));
  }
}
