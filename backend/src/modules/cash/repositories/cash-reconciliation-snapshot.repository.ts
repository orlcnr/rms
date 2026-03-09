import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { CashReconciliationSnapshot } from '../entities/cash-reconciliation-snapshot.entity';

@Injectable()
export class CashReconciliationSnapshotRepository {
  constructor(
    @InjectRepository(CashReconciliationSnapshot)
    private readonly repository: Repository<CashReconciliationSnapshot>,
  ) {}

  async findBySessionId(
    sessionId: string,
  ): Promise<CashReconciliationSnapshot | null> {
    return this.repository.findOne({
      where: { sessionId },
    });
  }

  async insertIfNotExists(
    payload: {
      sessionId: string;
      restaurantId: string;
      report: unknown;
      computedAt: Date;
    },
    manager?: EntityManager,
  ): Promise<{ inserted: boolean }> {
    const repo = manager
      ? manager.getRepository(CashReconciliationSnapshot)
      : this.repository;

    const result = await repo
      .createQueryBuilder()
      .insert()
      .into(CashReconciliationSnapshot)
      .values({
        sessionId: payload.sessionId,
        restaurantId: payload.restaurantId,
        report: payload.report as object,
        computedAt: payload.computedAt,
      })
      .orIgnore()
      .execute();

    return { inserted: (result.identifiers?.length || 0) > 0 };
  }
}
