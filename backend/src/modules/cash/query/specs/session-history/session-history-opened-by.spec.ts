import { SelectQueryBuilder } from 'typeorm';
import { QuerySpec } from '../../../../../common/query/query-spec.interface';
import { CashSession } from '../../../entities/cash-session.entity';

export class SessionHistoryOpenedBySpec implements QuerySpec<CashSession> {
  constructor(private readonly openedById: string) {}

  apply(qb: SelectQueryBuilder<CashSession>): SelectQueryBuilder<CashSession> {
    qb.andWhere('session.openedById = :openedById', {
      openedById: this.openedById,
    });
    return qb;
  }
}
