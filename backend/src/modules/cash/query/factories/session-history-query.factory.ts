import { Injectable } from '@nestjs/common';
import { QuerySpec } from '../../../../common/query/query-spec.interface';
import { GetSessionHistoryDto } from '../../dto/get-session-history.dto';
import { CashSession } from '../../entities/cash-session.entity';
import { SessionHistoryDateRangeSpec } from '../specs/session-history/session-history-date-range.spec';
import { SessionHistoryOpenedBySpec } from '../specs/session-history/session-history-opened-by.spec';
import { SessionHistoryRegisterSpec } from '../specs/session-history/session-history-register.spec';
import { SessionHistoryScopeSpec } from '../specs/session-history/session-history-scope.spec';
import { SessionHistoryStatusSpec } from '../specs/session-history/session-history-status.spec';

@Injectable()
export class SessionHistoryQueryFactory {
  create(
    dto: GetSessionHistoryDto,
    context: { restaurantId: string },
  ): QuerySpec<CashSession>[] {
    const specs: QuerySpec<CashSession>[] = [
      new SessionHistoryScopeSpec(context.restaurantId),
      new SessionHistoryDateRangeSpec(dto.startDate, dto.endDate),
    ];

    if (dto.registerId) {
      specs.push(new SessionHistoryRegisterSpec(dto.registerId));
    }
    if (dto.status) {
      specs.push(new SessionHistoryStatusSpec(dto.status));
    }
    if (dto.openedById) {
      specs.push(new SessionHistoryOpenedBySpec(dto.openedById));
    }

    return specs;
  }
}
