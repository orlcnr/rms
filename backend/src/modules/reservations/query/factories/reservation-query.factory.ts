import { Injectable } from '@nestjs/common';
import { QuerySpec } from '../../../../common/query/query-spec.interface';
import { GetReservationsDto } from '../../dto/get-reservations.dto';
import { Reservation } from '../../entities/reservation.entity';
import { ReservationCustomerSpec } from '../specs/reservation/reservation-customer.spec';
import { ReservationDateRangeSpec } from '../specs/reservation/reservation-date-range.spec';
import { ReservationDateSpec } from '../specs/reservation/reservation-date.spec';
import { ReservationScopeSpec } from '../specs/reservation/reservation-scope.spec';
import { ReservationStatusSpec } from '../specs/reservation/reservation-status.spec';
import { ReservationTableSpec } from '../specs/reservation/reservation-table.spec';

@Injectable()
export class ReservationQueryFactory {
  create(
    filters: GetReservationsDto,
    context: { restaurantId: string },
  ): QuerySpec<Reservation>[] {
    const specs: QuerySpec<Reservation>[] = [
      new ReservationScopeSpec(context.restaurantId),
    ];

    if (filters.date) {
      specs.push(new ReservationDateSpec(filters.date));
    } else if (filters.startDate && filters.endDate) {
      specs.push(new ReservationDateRangeSpec(filters.startDate, filters.endDate));
    }

    if (filters.status) {
      specs.push(new ReservationStatusSpec(filters.status));
    }

    if (filters.table_id) {
      specs.push(new ReservationTableSpec(filters.table_id));
    }

    if (filters.customer_id) {
      specs.push(new ReservationCustomerSpec(filters.customer_id));
    }

    return specs;
  }
}
