import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CashService } from './cash.service';
import { CashController } from './cash.controller';
import { CashRegister } from './entities/cash-register.entity';
import { CashSession } from './entities/cash-session.entity';
import { CashMovement } from './entities/cash-movement.entity';
import { TablesModule } from '../tables/tables.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([CashRegister, CashSession, CashMovement]),
    TablesModule,
  ],
  controllers: [CashController],
  providers: [CashService],
  exports: [CashService],
})
export class CashModule {}
