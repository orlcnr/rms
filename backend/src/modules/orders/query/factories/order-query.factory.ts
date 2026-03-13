import { Injectable } from '@nestjs/common';
import { QuerySpec } from '../../../../common/query/query-spec.interface';
import { Order } from '../../entities/order.entity';
import { GetOrdersDto } from '../../dto/get-orders.dto';
import { OrderStatusSpec } from '../specs/order-status.spec';
import { OrderWaiterSpec } from '../specs/order-waiter.spec';
import { OrderTypeSpec } from '../specs/order-type.spec';
import { OrderTableSpec } from '../specs/order-table.spec';
import { OrderDateRangeSpec } from '../specs/order-date-range.spec';

@Injectable()
export class OrderQueryFactory {
  create(filters: GetOrdersDto): Array<QuerySpec<Order>> {
    const specs: Array<QuerySpec<Order>> = [];

    if (filters.status) {
      specs.push(new OrderStatusSpec(filters.status));
    }

    if (filters.waiterId) {
      specs.push(new OrderWaiterSpec(filters.waiterId));
    }

    if (filters.type) {
      specs.push(new OrderTypeSpec(filters.type));
    }

    if (filters.tableId) {
      specs.push(new OrderTableSpec(filters.tableId));
    }

    if (filters.startDate || filters.endDate) {
      specs.push(new OrderDateRangeSpec(filters.startDate, filters.endDate));
    }

    return specs;
  }
}
