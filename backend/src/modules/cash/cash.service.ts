import { Injectable } from '@nestjs/common';
import type { Request } from 'express';
import type { QueryRunner } from 'typeorm';
import {
  OpenCashSessionDto,
  CloseCashSessionDto,
  CreateCashMovementDto,
  CreateCashRegisterDto,
} from './dto/cash-ops.dto';
import { GetSessionHistoryDto } from './dto/get-session-history.dto';
import { ReconciliationReportDto } from './dto/reconciliation-report.dto';
import { CashSummaryDto } from './dto/cash-summary.dto';
import { CashRegister } from './entities/cash-register.entity';
import { CashSession } from './entities/cash-session.entity';
import { CashMovement } from './entities/cash-movement.entity';
import { CashQueryService } from './services/cash-query.service';
import {
  CashCommandService,
  EnsureDefaultRegisterResult,
} from './services/cash-command.service';
import { OpenCashSessionUseCase } from './use-cases/open-cash-session.use-case';
import { CloseCashSessionUseCase } from './use-cases/close-cash-session.use-case';
import { AddCashMovementUseCase } from './use-cases/add-cash-movement.use-case';

type AuditActor = {
  id?: string;
  first_name?: string;
  last_name?: string;
};

@Injectable()
export class CashService {
  constructor(
    private readonly cashQueryService: CashQueryService,
    private readonly cashCommandService: CashCommandService,
    private readonly openCashSessionUseCase: OpenCashSessionUseCase,
    private readonly closeCashSessionUseCase: CloseCashSessionUseCase,
    private readonly addCashMovementUseCase: AddCashMovementUseCase,
  ) {}

  async getActiveRegister(restaurantId: string): Promise<CashRegister> {
    return this.cashQueryService.getActiveRegister(restaurantId);
  }

  async ensureDefaultRegister(
    restaurantId: string,
    actor?: AuditActor,
    request?: Request,
  ): Promise<EnsureDefaultRegisterResult> {
    return this.cashCommandService.ensureDefaultRegister(
      restaurantId,
      actor,
      request,
    );
  }

  async openSession(
    restaurantId: string,
    userId: string,
    dto: OpenCashSessionDto,
    actor?: AuditActor,
    request?: Request,
  ): Promise<CashSession> {
    return this.openCashSessionUseCase.execute(
      restaurantId,
      userId,
      dto,
      actor,
      request,
    );
  }

  async closeSession(
    userId: string,
    sessionId: string,
    dto: CloseCashSessionDto,
    queryRunner?: QueryRunner,
    actor?: AuditActor,
    request?: Request,
  ): Promise<CashSession> {
    return this.closeCashSessionUseCase.execute(
      userId,
      sessionId,
      dto,
      queryRunner,
      actor,
      request,
    );
  }

  async addMovement(
    userId: string,
    sessionId: string,
    dto: CreateCashMovementDto,
    queryRunner?: QueryRunner,
    actor?: AuditActor,
    request?: Request,
  ): Promise<CashMovement> {
    return this.addCashMovementUseCase.execute(
      userId,
      sessionId,
      dto,
      queryRunner,
      actor,
      request,
    );
  }

  async createRegister(
    restaurantId: string,
    dto: CreateCashRegisterDto,
    actor?: AuditActor,
    request?: Request,
  ): Promise<CashRegister> {
    return this.cashCommandService.createRegister(
      restaurantId,
      dto,
      actor,
      request,
    );
  }

  async getRegisters(restaurantId: string): Promise<any[]> {
    return this.cashQueryService.getRegisters(restaurantId);
  }

  async getSessionHistory(
    restaurantId: string,
    filters: GetSessionHistoryDto,
  ): Promise<{
    items: CashSession[];
    meta: {
      totalItems: number;
      itemCount: number;
      itemsPerPage: number;
      totalPages: number;
      currentPage: number;
    };
  }> {
    return this.cashQueryService.getSessionHistory(restaurantId, filters);
  }

  async getMovements(sessionId: string): Promise<CashMovement[]> {
    return this.cashQueryService.getMovements(sessionId);
  }

  async getSessions(registerId: string): Promise<CashSession[]> {
    return this.cashQueryService.getSessions(registerId);
  }

  async getSessionById(sessionId: string): Promise<CashSession> {
    return this.cashQueryService.getSessionById(sessionId);
  }

  async getReconciliationReport(
    restaurantId: string,
    sessionId: string,
  ): Promise<ReconciliationReportDto> {
    return this.cashQueryService.getReconciliationReport(
      restaurantId,
      sessionId,
    );
  }

  async getAllActiveSessions(restaurantId: string): Promise<
    Array<{
      register: CashRegister;
      session: CashSession;
      currentBalance: number;
      netCashChange: number;
    }>
  > {
    return this.cashQueryService.getAllActiveSessions(restaurantId);
  }

  async getSessionSummary(sessionId: string): Promise<CashSummaryDto> {
    return this.cashQueryService.getSessionSummary(sessionId);
  }

  async deleteMovementsBySession(sessionId: string): Promise<void> {
    return this.cashCommandService.deleteMovementsBySession(sessionId);
  }

  async deleteSession(sessionId: string): Promise<void> {
    return this.cashCommandService.deleteSession(sessionId);
  }

  async deleteRegister(
    registerId: string,
    actor?: AuditActor,
    request?: Request,
  ): Promise<void> {
    return this.cashCommandService.deleteRegister(registerId, actor, request);
  }
}
