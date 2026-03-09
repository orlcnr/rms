import { SelectQueryBuilder } from 'typeorm';
import { QuerySpec } from '../../../../../common/query/query-spec.interface';
import { Area } from '../../../entities/area.entity';

export class AreaScopeSpec implements QuerySpec<Area> {
  constructor(private readonly restaurantId: string) {}

  apply(qb: SelectQueryBuilder<Area>): void {
    qb.andWhere('area.restaurant_id = :restaurantId', {
      restaurantId: this.restaurantId,
    });
  }
}
