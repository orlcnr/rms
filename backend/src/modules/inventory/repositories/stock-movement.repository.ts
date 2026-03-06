import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { StockMovement } from '../entities/stock-movement.entity';

@Injectable()
export class StockMovementRepository {
  constructor(
    @InjectRepository(StockMovement)
    private readonly repository: Repository<StockMovement>,
  ) {}

  createBaseQuery(): SelectQueryBuilder<StockMovement> {
    return this.repository
      .createQueryBuilder('movement')
      .leftJoinAndSelect('movement.ingredient', 'ingredient');
  }
}
