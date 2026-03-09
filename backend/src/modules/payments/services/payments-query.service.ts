import { Injectable, NotFoundException } from '@nestjs/common';
import { paginate } from 'nestjs-typeorm-paginate';
import { PaginationMetaDto } from '../../../common/dto/pagination-meta.dto';
import { GetPaymentsDto } from '../dto/get-payments.dto';
import { PaymentResponseDto } from '../dto/payment-response.dto';
import { PaymentMapper } from '../mappers/payment.mapper';
import { PaymentQueryFactory } from '../query/factories/payment-query.factory';
import { PaymentRepository } from '../repositories/payment.repository';

@Injectable()
export class PaymentsQueryService {
  constructor(
    private readonly paymentRepository: PaymentRepository,
    private readonly paymentQueryFactory: PaymentQueryFactory,
  ) {}

  async findAll(
    restaurantId: string,
    queryDto: GetPaymentsDto,
  ): Promise<{ items: PaymentResponseDto[]; meta: PaginationMetaDto }> {
    const qb = this.paymentRepository.createBaseQuery();
    const specs = this.paymentQueryFactory.create(queryDto, { restaurantId });
    for (const spec of specs) {
      spec.apply(qb);
    }

    qb.orderBy('payment.created_at', 'DESC');

    const page = queryDto.page ?? 1;
    const limit = queryDto.limit ?? 10;
    const paginated = await paginate(qb, { page, limit });

    return {
      items: paginated.items.map((item) => PaymentMapper.toResponse(item)),
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

  async findAllByOrder(
    orderId: string,
    restaurantId: string,
  ): Promise<PaymentResponseDto[]> {
    const rows = await this.paymentRepository.findByOrderAndRestaurant(
      orderId,
      restaurantId,
    );

    if (!rows) {
      throw new NotFoundException('Payment list not found');
    }

    return rows.map((row) => PaymentMapper.toResponse(row));
  }
}
