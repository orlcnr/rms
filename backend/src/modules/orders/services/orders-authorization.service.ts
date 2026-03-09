import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Order } from '../entities/order.entity';
import { OrderErrorCodes } from '../errors/order-error-codes';

@Injectable()
export class OrdersAuthorizationService {
  assertOrderExists(order: Order | null): asserts order is Order {
    if (!order) {
      throw new NotFoundException(OrderErrorCodes.ORDER_NOT_FOUND);
    }
  }

  assertOrderRestaurantScope(order: Order, restaurantId: string): void {
    if (order.restaurantId !== restaurantId) {
      throw new ForbiddenException(OrderErrorCodes.ORDER_SCOPE_FORBIDDEN);
    }
  }
}
