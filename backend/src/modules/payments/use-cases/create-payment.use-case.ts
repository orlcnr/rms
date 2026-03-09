import { Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { CreatePaymentDto } from '../dto/create-payment.dto';
import { PaymentsCommandService } from '../services/payments-command.service';

@Injectable()
export class CreatePaymentUseCase {
  constructor(private readonly paymentsCommandService: PaymentsCommandService) {}

  execute(
    dto: CreatePaymentDto,
    userId?: string,
    actor?: { id?: string; first_name?: string; last_name?: string },
    request?: Request,
  ) {
    return this.paymentsCommandService.create(dto, userId, actor, request);
  }
}
