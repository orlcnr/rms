import { SelectQueryBuilder } from 'typeorm';
import { MenuItem } from '../../entities/menu-item.entity';
import { QuerySpec } from './query-spec.interface';

export class SearchSpec implements QuerySpec<MenuItem> {
  constructor(private readonly search: string) {}

  apply(qb: SelectQueryBuilder<MenuItem>): SelectQueryBuilder<MenuItem> {
    return qb.andWhere(
      '(item.name ILIKE :search OR item.description ILIKE :search)',
      { search: `%${this.search}%` },
    );
  }
}
