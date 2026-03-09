import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CashSession } from '../entities/cash-session.entity';
import { CashSessionStatus } from '../enums/cash.enum';

@Injectable()
export class CashSessionRepository {
  constructor(
    @InjectRepository(CashSession)
    private readonly repository: Repository<CashSession>,
  ) {}

  create(entity: Partial<CashSession>): CashSession {
    return this.repository.create(entity);
  }

  save(entity: CashSession): Promise<CashSession> {
    return this.repository.save(entity);
  }

  findById(sessionId: string): Promise<CashSession | null> {
    return this.repository.findOne({ where: { id: sessionId } });
  }

  findOpenByRegisterId(registerId: string): Promise<CashSession | null> {
    return this.repository.findOne({
      where: { cashRegisterId: registerId, status: CashSessionStatus.OPEN },
    });
  }
}
