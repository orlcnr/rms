import { Injectable } from '@nestjs/common';
import { QuerySpec } from '../../../../common/query/query-spec.interface';
import { GetPaymentsDto } from '../../dto/get-payments.dto';
import { Payment } from '../../entities/payment.entity';
import { PaymentDateRangeSpec } from '../specs/payment/payment-date-range.spec';
import { PaymentMethodSpec } from '../specs/payment/payment-method.spec';
import { PaymentOrderSpec } from '../specs/payment/payment-order.spec';
import { PaymentScopeSpec } from '../specs/payment/payment-scope.spec';
import { PaymentSearchSpec } from '../specs/payment/payment-search.spec';
import { PaymentStatusSpec } from '../specs/payment/payment-status.spec';

@Injectable()
export class PaymentQueryFactory {
  create(
    filters: GetPaymentsDto,
    context: { restaurantId: string },
  ): QuerySpec<Payment>[] {
    const specs: QuerySpec<Payment>[] = [
      new PaymentScopeSpec(context.restaurantId),
    ];

    if (filters.search) {
      specs.push(new PaymentSearchSpec(filters.search));
    }

    if (filters.method) {
      specs.push(new PaymentMethodSpec(filters.method));
    }

    if (filters.status) {
      specs.push(new PaymentStatusSpec(filters.status));
    }

    if (filters.startDate && filters.endDate) {
      specs.push(new PaymentDateRangeSpec(filters.startDate, filters.endDate));
    }

    if (filters.orderId) {
      specs.push(new PaymentOrderSpec(filters.orderId));
    }

    return specs;
  }
}
