import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CashMovement } from '../entities/cash-movement.entity';

@Injectable()
export class CashMovementRepository {
  constructor(
    @InjectRepository(CashMovement)
    private readonly repository: Repository<CashMovement>,
  ) {}

  findBySessionId(sessionId: string): Promise<CashMovement[]> {
    return this.repository.findBy({
      cashSessionId: sessionId,
    });
  }

  findBySessionIdOrdered(sessionId: string): Promise<CashMovement[]> {
    return this.repository.find({
      where: { cashSessionId: sessionId },
      order: { created_at: 'DESC' },
    });
  }

  create(entity: Partial<CashMovement>): CashMovement {
    return this.repository.create(entity);
  }

  save(entity: CashMovement): Promise<CashMovement> {
    return this.repository.save(entity);
  }

  deleteBySessionId(sessionId: string): Promise<void> {
    return this.repository
      .delete({ cashSessionId: sessionId })
      .then(() => undefined);
  }
}
