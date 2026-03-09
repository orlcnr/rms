import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { Table } from '../entities/table.entity';

@Injectable()
export class TableRepository {
  constructor(
    @InjectRepository(Table)
    private readonly repository: Repository<Table>,
  ) {}

  createBaseQuery(restaurantId: string): SelectQueryBuilder<Table> {
    return this.repository
      .createQueryBuilder('table')
      .leftJoinAndSelect('table.area', 'area')
      .where('table.restaurant_id = :restaurantId', { restaurantId });
  }

  findOneByIdAndRestaurant(
    id: string,
    restaurantId: string,
  ): Promise<Table | null> {
    return this.repository.findOne({
      where: { id, restaurant_id: restaurantId },
      relations: ['area'],
    });
  }

  findById(id: string): Promise<Table | null> {
    return this.repository.findOne({ where: { id }, relations: ['area'] });
  }

  create(entity: Partial<Table>): Table {
    return this.repository.create(entity);
  }

  save(entity: Table): Promise<Table> {
    return this.repository.save(entity);
  }

  async deleteById(id: string): Promise<void> {
    await this.repository.delete({ id });
  }
}
