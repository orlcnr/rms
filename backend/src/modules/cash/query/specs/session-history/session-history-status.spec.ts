import { SelectQueryBuilder } from 'typeorm';
import { QuerySpec } from '../../../../../common/query/query-spec.interface';
import { CashSessionStatus } from '../../../enums/cash.enum';
import { CashSession } from '../../../entities/cash-session.entity';

export class SessionHistoryStatusSpec implements QuerySpec<CashSession> {
  constructor(private readonly status: CashSessionStatus) {}

  apply(qb: SelectQueryBuilder<CashSession>): SelectQueryBuilder<CashSession> {
    qb.andWhere('session.status = :status', {
      status: this.status,
    });
    return qb;
  }
}
