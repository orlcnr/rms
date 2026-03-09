import { SelectQueryBuilder } from 'typeorm';
import { QuerySpec } from '../../../../../common/query/query-spec.interface';
import { CashSession } from '../../../entities/cash-session.entity';

export class SessionHistoryScopeSpec implements QuerySpec<CashSession> {
  constructor(private readonly restaurantId: string) {}

  apply(qb: SelectQueryBuilder<CashSession>): SelectQueryBuilder<CashSession> {
    qb.andWhere('register.restaurantId = :restaurantId', {
      restaurantId: this.restaurantId,
    });
    return qb;
  }
}
