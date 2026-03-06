import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import type { Request } from 'express';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner } from 'typeorm';
import { Ingredient } from '../entities/ingredient.entity';
import { Stock } from '../entities/stock.entity';
import { BranchStock } from '../entities/branch-stock.entity';
import { StockMovement, MovementType } from '../entities/stock-movement.entity';
import { CreateStockMovementDto } from '../dto/create-stock-movement.dto';
import { TransactionalHelper } from '../../../common/databases/transactional.helper';
import type { User } from '../../users/entities/user.entity';
import { AuditService } from '../../audit/audit.service';
import { AuditAction } from '../../audit/enums/audit-action.enum';
import { sanitizeAuditChanges } from '../../audit/utils/sanitize-audit.util';
import { toBaseUnit } from '../utils/unit-converter';
import { BranchCostService } from '../services/branch-cost.service';

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
    @InjectRepository(BranchStock)
    private readonly branchStockRepository: Repository<BranchStock>,
    @InjectRepository(StockMovement)
    private readonly movementRepository: Repository<StockMovement>,
    private readonly transactionalHelper: TransactionalHelper,
    private readonly auditService: AuditService,
    private readonly branchCostService: BranchCostService,
  ) {}

  private buildActorName(actor?: User): string | undefined {
    if (!actor?.first_name) {
      return undefined;
    }
    return `${actor.first_name} ${actor.last_name || ''}`.trim();
  }

  /**
   * Stok hareketini oluşturur ve maliyetleri günceller
   */
  async execute(
    dto: CreateStockMovementDto,
    actor?: User,
    request?: Request,
  ): Promise<StockMovement> {
    // Validation: unit_price sadece IN hareketlerinde izinli
    if (dto.type === MovementType.IN && !dto.unit_price) {
      throw new BadRequestException(
        'Giriş hareketleri için birim fiyat zorunludur',
      );
    }

    this.logger.log(
      `Creating stock movement: type=${dto.type}, ingredient=${dto.ingredient_id}, quantity=${dto.quantity}`,
    );

    const savedMovement = await this.transactionalHelper.runInTransaction(
      async (queryRunner: QueryRunner) => {
        // 1. Ingredient'i kilitli olarak çek
        const ingredient = await this.getIngredientWithLock(
          queryRunner,
          dto.ingredient_id,
        );

        // 2. Stock'u kilitli olarak çek
        const stock = await this.getStockWithLock(
          queryRunner,
          dto.ingredient_id,
        );

        const movementUnit =
          dto.unit || ingredient.base_unit || ingredient.unit;
        const baseQuantity = toBaseUnit(
          dto.quantity,
          movementUnit,
          Number(ingredient.pack_size) || 1,
        );

        // 3. Yeni stok miktarını hesapla
        const newQuantity = this.calculateNewQuantity(
          Number(stock.quantity),
          dto.type,
          baseQuantity,
        );

        // Negatif stok kontrolü
        if (newQuantity < 0) {
          throw new BadRequestException('Stok miktarı negatif olamaz');
        }

        const branchId = actor?.restaurant_id || null;
        let currentBranchQty = 0;
        let branchStock: BranchStock | null = null;

        if (branchId) {
          await queryRunner.manager.query(
            `
            INSERT INTO operations.branch_stocks (ingredient_id, branch_id, quantity)
            VALUES ($1, $2, 0)
            ON CONFLICT (ingredient_id, branch_id) DO NOTHING
            `,
            [dto.ingredient_id, branchId],
          );

          branchStock = await queryRunner.manager.findOne(BranchStock, {
            where: {
              ingredient_id: dto.ingredient_id,
              branch_id: branchId,
            },
            lock: { mode: 'pessimistic_write' },
          });

          if (!branchStock) {
            throw new NotFoundException('Şube stok kaydı bulunamadı');
          }

          currentBranchQty = Number(branchStock.quantity);
        }

        // 4. IN hareketi ise maliyetleri güncelle
        if (dto.type === MovementType.IN && dto.unit_price) {
          if (branchId) {
            const branchCost = await this.branchCostService.applyInMovement({
              manager: queryRunner.manager,
              ingredientId: ingredient.id,
              branchId,
              incomingQty: baseQuantity,
              currentQty: currentBranchQty,
              unitPrice: Number(dto.unit_price),
            });

            this.logger.log(
              `Branch costs updated: ingredient=${ingredient.name}, ` +
                `branch=${branchId}, average_cost=${branchCost.average_cost}, ` +
                `last_price=${branchCost.last_price}`,
            );
          } else {
            ingredient.updateCosts(
              baseQuantity,
              Number(dto.unit_price),
              Number(stock.quantity),
            );
            await queryRunner.manager.save(ingredient);
          }
        }

        // 5. Stok miktarını güncelle
        stock.quantity = newQuantity;
        await queryRunner.manager.save(stock);

        // 6. Stok hareketini kaydet
        const movement = this.movementRepository.create({
          ...dto,
          quantity: dto.quantity, // Girilen birim cinsinden
          branch_id: branchId,
          unit: movementUnit,
          base_quantity: baseQuantity,
        });
        const savedMovement = await queryRunner.manager.save(movement);

        if (branchId && branchStock) {
          if (dto.type === MovementType.ADJUST) {
            branchStock.quantity = baseQuantity;
          } else {
            const multiplier = dto.type === MovementType.OUT ? -1 : 1;
            branchStock.quantity = currentBranchQty + baseQuantity * multiplier;
          }
          await queryRunner.manager.save(BranchStock, branchStock);
        }

        this.logger.log(
          `Stock movement created: ${savedMovement.id}, type: ${dto.type}, ` +
            `ingredient: ${ingredient.name}, quantity: ${dto.quantity}`,
        );

        return savedMovement;
      },
    );

    const headerUserAgent = request?.headers?.['user-agent'];
    const userAgent =
      typeof headerUserAgent === 'string'
        ? headerUserAgent
        : headerUserAgent?.[0];

    await this.auditService.safeEmitLog(
      {
        action: AuditAction.INVENTORY_STOCK_MOVEMENT_ADDED,
        resource: 'INVENTORY',
        user_id: actor?.id,
        user_name: this.buildActorName(actor),
        restaurant_id: actor?.restaurant_id,
        payload: {
          movementId: savedMovement.id,
          ingredientId: savedMovement.ingredient_id,
        },
        changes: sanitizeAuditChanges({
          after: {
            id: savedMovement.id,
            ingredient_id: savedMovement.ingredient_id,
            type: savedMovement.type,
            quantity: Number(savedMovement.quantity),
            base_quantity: Number(savedMovement.base_quantity),
          },
        }),
        ip_address: request?.ip,
        user_agent: userAgent,
      },
      'CreateStockMovementUseCase.execute',
    );
    this.auditService.markRequestAsAudited(
      request as unknown as Record<string, unknown>,
    );

    return savedMovement;
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
