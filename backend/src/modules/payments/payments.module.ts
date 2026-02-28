import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { Payment } from './entities/payment.entity';
import { Customer } from '../customers/entities/customer.entity';
import { InventoryModule } from '../inventory/inventory.module';
import { ConfigModule } from '@nestjs/config';
import { SettingsModule } from '../settings/settings.module';
import { CashModule } from '../cash/cash.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Payment, Customer]),
    InventoryModule,
    ConfigModule,
    SettingsModule,
    CashModule,
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
