import { SelectQueryBuilder } from 'typeorm';
import { MenuItem } from '../../entities/menu-item.entity';
import { QuerySpec } from './query-spec.interface';

export class StockStatusSpec implements QuerySpec<MenuItem> {
  constructor(
    private readonly stockStatus?:
      | 'all'
      | 'in_stock'
      | 'out_of_stock'
      | 'critical',
  ) {}

  apply(qb: SelectQueryBuilder<MenuItem>): SelectQueryBuilder<MenuItem> {
    if (!this.stockStatus || this.stockStatus === 'all') {
      return qb;
    }

    if (this.stockStatus === 'out_of_stock') {
      return qb.andWhere('(stock.id IS NULL OR stock.quantity <= 0)');
    }

    if (this.stockStatus === 'critical') {
      return qb.andWhere(
        'stock.quantity > 0 AND stock.quantity <= ingredient.critical_level',
      );
    }

    return qb.andWhere(
      'stock.quantity > COALESCE(ingredient.critical_level, 0)',
    );
  }
}
