import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CashRegister } from '../entities/cash-register.entity';

@Injectable()
export class CashRegisterRepository {
  constructor(
    @InjectRepository(CashRegister)
    private readonly repository: Repository<CashRegister>,
  ) {}

  findActiveByRestaurant(restaurantId: string): Promise<CashRegister | null> {
    return this.repository.findOneBy({
      restaurantId,
      active: true,
    });
  }

  createWithDefaults(data: Partial<CashRegister>): CashRegister {
    return this.repository.create(data);
  }

  save(entity: CashRegister): Promise<CashRegister> {
    return this.repository.save(entity);
  }

  findOneByName(
    restaurantId: string,
    name: string,
  ): Promise<CashRegister | null> {
    return this.repository.findOneBy({ restaurantId, name });
  }

  findById(id: string): Promise<CashRegister | null> {
    return this.repository.findOneBy({ id });
  }

  deleteById(id: string): Promise<void> {
    return this.repository.delete({ id }).then(() => undefined);
  }
}
