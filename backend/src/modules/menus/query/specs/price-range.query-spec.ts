import { SelectQueryBuilder } from 'typeorm';
import { MenuItem } from '../../entities/menu-item.entity';
import { QuerySpec } from './query-spec.interface';

export class PriceRangeSpec implements QuerySpec<MenuItem> {
  constructor(
    private readonly minPrice?: number,
    private readonly maxPrice?: number,
  ) {}

  apply(qb: SelectQueryBuilder<MenuItem>): SelectQueryBuilder<MenuItem> {
    if (this.minPrice !== undefined && this.minPrice !== null) {
      qb.andWhere('item.price >= :minPrice', { minPrice: this.minPrice });
    }

    if (this.maxPrice !== undefined && this.maxPrice !== null) {
      qb.andWhere('item.price <= :maxPrice', { maxPrice: this.maxPrice });
    }

    return qb;
  }
}
