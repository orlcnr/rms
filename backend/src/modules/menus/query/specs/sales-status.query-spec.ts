import { SelectQueryBuilder } from 'typeorm';
import { MenuItem } from '../../entities/menu-item.entity';
import { QuerySpec } from './query-spec.interface';

export class SalesStatusSpec implements QuerySpec<MenuItem> {
  constructor(private readonly salesStatus?: 'all' | 'active' | 'inactive') {}

  apply(qb: SelectQueryBuilder<MenuItem>): SelectQueryBuilder<MenuItem> {
    if (!this.salesStatus || this.salesStatus === 'all') {
      return qb;
    }

    return qb.andWhere('item.is_available = :isAvailable', {
      isAvailable: this.salesStatus === 'active',
    });
  }
}
