import { Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { CreateSplitPaymentDto } from './dto/create-split-payment.dto';
import { GetPaymentsDto } from './dto/get-payments.dto';
import { PaymentMethod } from './entities/payment.entity';
import { PaymentResponseDto, SplitPaymentResponseDto } from './dto/payment-response.dto';
import { PaymentMapper } from './mappers/payment.mapper';
import { PaymentsAuthorizationService } from './services/payments-authorization.service';
import { PaymentsQueryService } from './services/payments-query.service';
import { CreatePaymentUseCase } from './use-cases/create-payment.use-case';
import { CreateSplitPaymentUseCase } from './use-cases/create-split-payment.use-case';
import { RevertPaymentUseCase } from './use-cases/revert-payment.use-case';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly paymentsQueryService: PaymentsQueryService,
    private readonly paymentsAuthorizationService: PaymentsAuthorizationService,
    private readonly createPaymentUseCase: CreatePaymentUseCase,
    private readonly createSplitPaymentUseCase: CreateSplitPaymentUseCase,
    private readonly revertPaymentUseCase: RevertPaymentUseCase,
  ) {}

  async findAll(queryDto: GetPaymentsDto, actorRestaurantId: string) {
    return this.paymentsQueryService.findAll(actorRestaurantId, queryDto);
  }

  async findAllByOrder(orderId: string, actorRestaurantId: string): Promise<PaymentResponseDto[]> {
    await this.paymentsAuthorizationService.assertOrderInScope(
      orderId,
      actorRestaurantId,
    );
    return this.paymentsQueryService.findAllByOrder(orderId, actorRestaurantId);
  }

  async create(
    createPaymentDto: CreatePaymentDto,
    userId?: string,
    actor?: {
      id?: string;
      first_name?: string;
      last_name?: string;
      restaurant_id?: string;
    },
    request?: Request,
  ): Promise<PaymentResponseDto> {
    if (actor?.restaurant_id) {
      await this.paymentsAuthorizationService.assertOrderInScope(
        createPaymentDto.order_id,
        actor.restaurant_id,
      );
    }

    const result = await this.createPaymentUseCase.execute(
      createPaymentDto,
      userId,
      actor,
      request,
    );
    return PaymentMapper.toResponse(result);
  }

  async createSplitPayment(
    dto: CreateSplitPaymentDto,
    userId?: string,
    actor?: {
      id?: string;
      first_name?: string;
      last_name?: string;
      restaurant_id?: string;
    },
    request?: Request,
  ): Promise<SplitPaymentResponseDto> {
    if (actor?.restaurant_id) {
      await this.paymentsAuthorizationService.assertOrderInScope(
        dto.order_id,
        actor.restaurant_id,
      );
    }

    const result = await this.createSplitPaymentUseCase.execute(
      dto,
      userId,
      actor,
      request,
    );

    return {
      payments: result.payments.map((payment) => PaymentMapper.toResponse(payment)),
      change: result.change,
    };
  }

  async revertPayment(
    paymentId: string,
    reason: string,
    refundMethod?: PaymentMethod,
    actor?: {
      id?: string;
      first_name?: string;
      last_name?: string;
      restaurant_id?: string;
    },
    request?: Request,
  ): Promise<PaymentResponseDto> {
    if (actor?.restaurant_id) {
      await this.paymentsAuthorizationService.assertPaymentInScope(
        paymentId,
        actor.restaurant_id,
      );
    }

    const result = await this.revertPaymentUseCase.execute(
      paymentId,
      reason,
      refundMethod,
      actor,
      request,
    );
    return PaymentMapper.toResponse(result);
  }
}
