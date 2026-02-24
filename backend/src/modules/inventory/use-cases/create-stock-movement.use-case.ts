import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner } from 'typeorm';
import { Ingredient } from '../entities/ingredient.entity';
import { Stock } from '../entities/stock.entity';
import { StockMovement, MovementType } from '../entities/stock-movement.entity';
import { CreateStockMovementDto } from '../dto/create-stock-movement.dto';
import { TransactionalHelper } from '../../../common/databases/transactional.helper';

/**
 * CreateStockMovementUseCase - DDD Uyumlu Stok Hareketi Oluşturma Servisi
 *
 * Sorumluluklar:
 * - Stok hareketi oluşturma iş mantığını yönetir
 * - IN hareketlerinde maliyetleri günceller
 * - Tüm işlemleri transaction içinde yürütür
 *
 * Business Logic:
 * 1. Ingredient ve Stock kayıtlarını kilitli olarak çeker
 * 2. Yeni stok miktarını hesaplar
 * 3. IN hareketi ise maliyetleri günceller (ağırlıklı ortalama)
 * 4. Stok hareketini kaydeder
 */
@Injectable()
export class CreateStockMovementUseCase {
  private readonly logger = new Logger(CreateStockMovementUseCase.name);

  constructor(
    @InjectRepository(Ingredient)
    private readonly ingredientRepository: Repository<Ingredient>,
    @InjectRepository(Stock)
    private readonly stockRepository: Repository<Stock>,
    @InjectRepository(StockMovement)
    private readonly movementRepository: Repository<StockMovement>,
    private readonly transactionalHelper: TransactionalHelper,
  ) {}

  /**
   * Stok hareketini oluşturur ve maliyetleri günceller
   */
  async execute(dto: CreateStockMovementDto): Promise<StockMovement> {
    // Validation: unit_price sadece IN hareketlerinde izinli
    if (dto.type === MovementType.IN && !dto.unit_price) {
      throw new BadRequestException('Giriş hareketleri için birim fiyat zorunludur');
    }

    this.logger.log(
      `Creating stock movement: type=${dto.type}, ingredient=${dto.ingredient_id}, quantity=${dto.quantity}`,
    );

    return this.transactionalHelper.runInTransaction(
      async (queryRunner: QueryRunner) => {
        // 1. Ingredient'i kilitli olarak çek
        const ingredient = await this.getIngredientWithLock(
          queryRunner,
          dto.ingredient_id,
        );

        // 2. Stock'u kilitli olarak çek
        const stock = await this.getStockWithLock(queryRunner, dto.ingredient_id);

        // 3. Yeni stok miktarını hesapla
        const newQuantity = this.calculateNewQuantity(
          Number(stock.quantity),
          dto.type,
          dto.quantity,
        );

        // Negatif stok kontrolü
        if (newQuantity < 0) {
          throw new BadRequestException('Stok miktarı negatif olamaz');
        }

        // 4. IN hareketi ise maliyetleri güncelle
        if (dto.type === MovementType.IN && dto.unit_price) {
          ingredient.updateCosts(dto.quantity, dto.unit_price, Number(stock.quantity));
          await queryRunner.manager.save(ingredient);

          this.logger.log(
            `Costs updated: ingredient=${ingredient.name}, ` +
            `average_cost=${ingredient.average_cost}, last_price=${ingredient.last_price}`,
          );
        }

        // 5. Stok miktarını güncelle
        stock.quantity = newQuantity;
        await queryRunner.manager.save(stock);

        // 6. Stok hareketini kaydet
        const movement = this.movementRepository.create({
          ...dto,
          quantity: dto.quantity, // Mutlak değer olarak kaydet
        });
        const savedMovement = await queryRunner.manager.save(movement);

        this.logger.log(
          `Stock movement created: ${savedMovement.id}, type: ${dto.type}, ` +
          `ingredient: ${ingredient.name}, quantity: ${dto.quantity}`,
        );

        return savedMovement;
      },
    );
  }

  // ===============================
  // PRIVATE HELPERS
  // ===============================

  /**
   * Ingredient'i pessimistic lock ile çeker
   */
  private async getIngredientWithLock(
    queryRunner: QueryRunner,
    ingredientId: string,
  ): Promise<Ingredient> {
    const ingredient = await queryRunner.manager.findOne(Ingredient, {
      where: { id: ingredientId },
      lock: { mode: 'pessimistic_write' },
    });

    if (!ingredient) {
      throw new NotFoundException('Malzeme bulunamadı');
    }

    return ingredient;
  }

  /**
   * Stock'u pessimistic lock ile çeker
   */
  private async getStockWithLock(
    queryRunner: QueryRunner,
    ingredientId: string,
  ): Promise<Stock> {
    const stock = await queryRunner.manager.findOne(Stock, {
      where: { ingredient_id: ingredientId },
      lock: { mode: 'pessimistic_write' },
    });

    if (!stock) {
      throw new NotFoundException('Stok kaydı bulunamadı');
    }

    return stock;
  }

  /**
   * Yeni stok miktarını hesaplar
   */
  private calculateNewQuantity(
    currentQuantity: number,
    type: MovementType,
    movementQuantity: number,
  ): number {
    switch (type) {
      case MovementType.IN:
        return currentQuantity + movementQuantity;
      case MovementType.OUT:
        return currentQuantity - movementQuantity;
      case MovementType.ADJUST:
        return movementQuantity;
      default:
        return currentQuantity;
    }
  }
}
