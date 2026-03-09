import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { paginate } from 'nestjs-typeorm-paginate';
import { PaginationMetaDto } from '../../../common/dto/pagination-meta.dto';
import { GetOrdersDto } from '../dto/get-orders.dto';
import { OrderResponseDto } from '../dto/order-response.dto';
import { OrderMapper } from '../mappers/order.mapper';
import { OrderQueryFactory } from '../query/factories/order-query.factory';
import { OrdersRepository } from '../repositories/orders.repository';
import { OrderErrorCodes } from '../errors/order-error-codes';

@Injectable()
export class OrdersQueryService {
  private readonly logger = new Logger(OrdersQueryService.name);

  constructor(
    private readonly ordersRepository: OrdersRepository,
    private readonly orderQueryFactory: OrderQueryFactory,
  ) {}

  async findAll(
    restaurantId: string,
    filters: GetOrdersDto,
  ): Promise<{
    items: OrderResponseDto[];
    meta: PaginationMetaDto;
  }> {
    if (filters.limit && !filters.page) {
      this.logger.warn(
        JSON.stringify({
          event: 'orders.legacy_limit_mode',
          restaurantId,
          limit: filters.limit,
        }),
      );
    }

    const qb = this.ordersRepository.createBaseListQuery(restaurantId);
    const specs = this.orderQueryFactory.create(filters);
    for (const spec of specs) {
      spec.apply(qb);
    }

    qb.orderBy('order.created_at', 'DESC');

    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;

    const paginated = await paginate(qb, { page, limit });

    return {
      items: paginated.items.map((order) => OrderMapper.toDto(order)),
      meta: new PaginationMetaDto({
        page,
        limit,
        itemCount: paginated.meta.itemCount ?? 0,
        totalItems: paginated.meta.totalItems ?? 0,
        totalPages: paginated.meta.totalPages ?? 0,
        hasPreviousPage: page > 1,
        hasNextPage: page < (paginated.meta.totalPages ?? 0),
      }),
    };
  }

  async findOne(id: string): Promise<OrderResponseDto> {
    const order = await this.ordersRepository.findOneWithRelations(id);
    if (!order) {
      throw new NotFoundException(OrderErrorCodes.ORDER_NOT_FOUND);
    }
    return OrderMapper.toDto(order);
  }

  async findAllByRestaurant(restaurantId: string): Promise<OrderResponseDto[]> {
    const orders = await this.ordersRepository.findByRestaurant(restaurantId);
    return orders.map((order) => OrderMapper.toDto(order));
  }
}
