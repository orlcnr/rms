import { SelectQueryBuilder } from 'typeorm';
import { QuerySpec } from '../../../../../common/query/query-spec.interface';
import { CashSession } from '../../../entities/cash-session.entity';

export class SessionHistoryRegisterSpec implements QuerySpec<CashSession> {
  constructor(private readonly registerId: string) {}

  apply(qb: SelectQueryBuilder<CashSession>): SelectQueryBuilder<CashSession> {
    qb.andWhere('session.cashRegisterId = :registerId', {
      registerId: this.registerId,
    });
    return qb;
  }
}
