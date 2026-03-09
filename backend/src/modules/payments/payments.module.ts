import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { Payment } from './entities/payment.entity';
import { Customer } from '../customers/entities/customer.entity';
import { Order } from '../orders/entities/order.entity';
import { InventoryModule } from '../inventory/inventory.module';
import { ConfigModule } from '@nestjs/config';
import { SettingsModule } from '../settings/settings.module';
import { CashModule } from '../cash/cash.module';
import { QrGuestModule } from '../qr-guest/qr-guest.module';
import { PaymentsQueryService } from './services/payments-query.service';
import { PaymentsCommandService } from './services/payments-command.service';
import { PaymentsAuthorizationService } from './services/payments-authorization.service';
import { PaymentRepository } from './repositories/payment.repository';
import { PaymentQueryFactory } from './query/factories/payment-query.factory';
import { CreatePaymentUseCase } from './use-cases/create-payment.use-case';
import { CreateSplitPaymentUseCase } from './use-cases/create-split-payment.use-case';
import { RevertPaymentUseCase } from './use-cases/revert-payment.use-case';
import { RecordPaymentCashMovementsUseCase } from './use-cases/record-payment-cash-movements.use-case';
import { PaymentStockDeductionListener } from './services/payment-stock-deduction.listener';

@Module({
  imports: [
    TypeOrmModule.forFeature([Payment, Customer, Order]),
    InventoryModule,
    ConfigModule,
    SettingsModule,
    CashModule,
    QrGuestModule,
  ],
  controllers: [PaymentsController],
  providers: [
    PaymentsService,
    PaymentsQueryService,
    PaymentsCommandService,
    PaymentsAuthorizationService,
    PaymentRepository,
    PaymentQueryFactory,
    CreatePaymentUseCase,
    CreateSplitPaymentUseCase,
    RevertPaymentUseCase,
    RecordPaymentCashMovementsUseCase,
    PaymentStockDeductionListener,
  ],
  exports: [PaymentsService],
})
export class PaymentsModule {}
