import { SelectQueryBuilder } from 'typeorm';
import { MenuItem } from '../../entities/menu-item.entity';
import { QuerySpec } from './query-spec.interface';

export class CategorySpec implements QuerySpec<MenuItem> {
  constructor(private readonly categoryId: string) {}

  apply(qb: SelectQueryBuilder<MenuItem>): SelectQueryBuilder<MenuItem> {
    if (this.categoryId === 'all') {
      return qb;
    }

    return qb.andWhere('item.category_id = :categoryId', {
      categoryId: this.categoryId,
    });
  }
}
