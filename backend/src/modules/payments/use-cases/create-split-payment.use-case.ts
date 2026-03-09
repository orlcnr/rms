import { Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { CreateSplitPaymentDto } from '../dto/create-split-payment.dto';
import { PaymentsCommandService } from '../services/payments-command.service';

@Injectable()
export class CreateSplitPaymentUseCase {
  constructor(private readonly paymentsCommandService: PaymentsCommandService) {}

  execute(
    dto: CreateSplitPaymentDto,
    userId?: string,
    actor?: { id?: string; first_name?: string; last_name?: string },
    request?: Request,
  ) {
    return this.paymentsCommandService.createSplitPayment(
      dto,
      userId,
      actor,
      request,
    );
  }
}
