import { Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { PaymentsCommandService } from '../services/payments-command.service';
import { PaymentMethod } from '../entities/payment.entity';

@Injectable()
export class RevertPaymentUseCase {
  constructor(private readonly paymentsCommandService: PaymentsCommandService) {}

  execute(
    paymentId: string,
    reason: string,
    refundMethod?: PaymentMethod,
    actor?: { id?: string; first_name?: string; last_name?: string },
    request?: Request,
  ) {
    return this.paymentsCommandService.revertPayment(
      paymentId,
      reason,
      refundMethod,
      actor,
      request,
    );
  }
}
