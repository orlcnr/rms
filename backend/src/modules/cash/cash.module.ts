import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CashService } from './cash.service';
import { CashController } from './cash.controller';
import { CashRegister } from './entities/cash-register.entity';
import { CashSession } from './entities/cash-session.entity';
import { CashMovement } from './entities/cash-movement.entity';
import { CashReconciliationSnapshot } from './entities/cash-reconciliation-snapshot.entity';
import { CashReconciliationSnapshotRepository } from './repositories/cash-reconciliation-snapshot.repository';
import { TablesModule } from '../tables/tables.module';
import { RulesModule } from '../rules/rules.module';
import { CashQueryService } from './services/cash-query.service';
import { CashCommandService } from './services/cash-command.service';
import { SessionHistoryQueryFactory } from './query/factories/session-history-query.factory';
import { OpenCashSessionUseCase } from './use-cases/open-cash-session.use-case';
import { CloseCashSessionUseCase } from './use-cases/close-cash-session.use-case';
import { AddCashMovementUseCase } from './use-cases/add-cash-movement.use-case';
import { CashRegisterRepository } from './repositories/cash-register.repository';
import { CashSessionRepository } from './repositories/cash-session.repository';
import { CashMovementRepository } from './repositories/cash-movement.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CashRegister,
      CashSession,
      CashMovement,
      CashReconciliationSnapshot,
    ]),
    TablesModule,
    forwardRef(() => RulesModule),
  ],
  controllers: [CashController],
  providers: [
    CashService,
    CashQueryService,
    CashCommandService,
    CashReconciliationSnapshotRepository,
    CashRegisterRepository,
    CashSessionRepository,
    CashMovementRepository,
    SessionHistoryQueryFactory,
    OpenCashSessionUseCase,
    CloseCashSessionUseCase,
    AddCashMovementUseCase,
  ],
  exports: [CashService],
})
export class CashModule {}
