import { SelectQueryBuilder } from 'typeorm';
import { QuerySpec } from '../../../../../common/query/query-spec.interface';
import { Area } from '../../../entities/area.entity';

export class AreaSearchSpec implements QuerySpec<Area> {
  constructor(private readonly search: string) {}

  apply(qb: SelectQueryBuilder<Area>): void {
    qb.andWhere('area.name ILIKE :search', { search: `%${this.search}%` });
  }
}
