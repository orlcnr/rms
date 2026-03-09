import { Injectable } from '@nestjs/common';
import { CashMovementType } from '../../cash/enums/cash.enum';
import { CashService } from '../../cash/cash.service';
import { PaymentMethod } from '../entities/payment.entity';

@Injectable()
export class RecordPaymentCashMovementsUseCase {
  constructor(private readonly cashService: CashService) {}

  async execute(params: {
    actorId: string;
    sessionId: string;
    registerId: string;
    amount: number;
    paymentMethod: PaymentMethod;
    description: string;
    tipAmount?: number;
  }): Promise<void> {
    await this.cashService.addMovement(
      params.actorId,
      params.sessionId,
      {
        cash_register_id: params.registerId,
        amount: params.amount,
        type: CashMovementType.SALE,
        paymentMethod: params.paymentMethod,
        description: params.description,
        is_payment: true,
      },
      undefined as never,
    );

    if (params.tipAmount && params.tipAmount > 0) {
      await this.cashService.addMovement(
        params.actorId,
        params.sessionId,
        {
          cash_register_id: params.registerId,
          amount: params.tipAmount,
          type: CashMovementType.IN,
          paymentMethod: params.paymentMethod,
          description: `Tip - ${params.description}`,
          isTip: true,
        },
        undefined as never,
      );
    }
  }
}
