import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Request } from 'express';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BranchMenuOverride } from '../entities/branch-menu-override.entity';
import { MenuItem } from '../entities/menu-item.entity';
import { Restaurant } from '../../restaurants/entities/restaurant.entity';
import { UpsertBranchMenuOverrideDto } from '../dto/upsert-branch-menu-override.dto';
import { EffectiveMenuCacheService } from './effective-menu-cache.service';
import {
  BranchOverrideBulkOperation,
  BulkBranchMenuOverridesDto,
  BulkBranchMenuOverridesResult,
} from '../dto/bulk-branch-menu-overrides.dto';
import { AuditService } from '../../audit/audit.service';
import { AuditAction } from '../../audit/enums/audit-action.enum';
import { sanitizeAuditChanges } from '../../audit/utils/sanitize-audit.util';
import type { User } from '../../users/entities/user.entity';

@Injectable()
export class BranchMenuOverridesService {
  constructor(
    @InjectRepository(BranchMenuOverride)
    private readonly overrideRepository: Repository<BranchMenuOverride>,
    @InjectRepository(MenuItem)
    private readonly menuItemRepository: Repository<MenuItem>,
    @InjectRepository(Restaurant)
    private readonly restaurantRepository: Repository<Restaurant>,
    private readonly effectiveMenuCacheService: EffectiveMenuCacheService,
    private readonly auditService: AuditService,
  ) {}

  private buildActorName(user?: User): string | undefined {
    if (!user?.first_name) {
      return undefined;
    }
    return `${user.first_name} ${user.last_name || ''}`.trim();
  }

  private resolveAuditRestaurantId(actor: User | undefined, branchId: string) {
    const actorWithRestaurant = actor as
      | (User & { restaurantId?: string | null })
      | undefined;
    return (
      actorWithRestaurant?.restaurant_id ||
      actorWithRestaurant?.restaurantId ||
      branchId
    );
  }

  async upsert(
    branchId: string,
    menuItemId: string,
    dto: UpsertBranchMenuOverrideDto,
    actor?: User,
    request?: Request,
  ): Promise<BranchMenuOverride> {
    const [branch, menuItem] = await Promise.all([
      this.restaurantRepository.findOne({ where: { id: branchId } }),
      this.menuItemRepository.findOne({ where: { id: menuItemId } }),
    ]);

    if (!branch) {
      throw new NotFoundException(`Branch #${branchId} not found`);
    }

    if (!menuItem) {
      throw new NotFoundException(`Menu item #${menuItemId} not found`);
    }

    const existing = await this.overrideRepository.findOne({
      where: { branch_id: branchId, menu_item_id: menuItemId },
    });
    const beforeSnapshot = existing
      ? {
          id: existing.id,
          action: existing.action,
          custom_price: existing.custom_price,
        }
      : undefined;

    const saved = await this.overrideRepository.save(
      this.overrideRepository.create({
        ...(existing || {}),
        branch_id: branchId,
        menu_item_id: menuItemId,
        action: 'hide',
        // custom_price varsa fiyat override, yoksa hide override olarak davranır
        custom_price: dto.custom_price !== undefined ? dto.custom_price : null,
      }),
    );

    if (branch.brand_id) {
      await this.effectiveMenuCacheService.invalidateBrand(branch.brand_id);
    }
    await this.effectiveMenuCacheService.invalidateBranch(branchId);

    await this.auditService.safeEmitLog(
      {
        action: AuditAction.BRANCH_ITEM_OVERRIDE_UPSERTED,
        resource: 'MENUS',
        user_id: actor?.id,
        user_name: this.buildActorName(actor),
        restaurant_id: this.resolveAuditRestaurantId(actor, branchId),
        payload: {
          branchId,
          menuItemId,
        },
        changes: sanitizeAuditChanges({
          before: beforeSnapshot,
          after: {
            id: saved.id,
            action: saved.action,
            custom_price: saved.custom_price,
          },
        }),
        ip_address: request?.ip,
        user_agent: request?.headers['user-agent'],
      },
      'BranchMenuOverridesService.upsert',
    );
    this.auditService.markRequestAsAudited(
      request as unknown as Record<string, unknown>,
    );

    return saved;
  }

  async remove(
    branchId: string,
    menuItemId: string,
    actor?: User,
    request?: Request,
  ): Promise<void> {
    const existing = await this.overrideRepository.findOne({
      where: { branch_id: branchId, menu_item_id: menuItemId },
      relations: ['branch'],
    });

    if (!existing) {
      return;
    }
    const beforeSnapshot = {
      id: existing.id,
      action: existing.action,
      custom_price: existing.custom_price,
    };

    await this.overrideRepository.delete(existing.id);
    if (existing.branch?.brand_id) {
      await this.effectiveMenuCacheService.invalidateBrand(
        existing.branch.brand_id,
      );
    }
    await this.effectiveMenuCacheService.invalidateBranch(branchId);

    await this.auditService.safeEmitLog(
      {
        action: AuditAction.BRANCH_ITEM_OVERRIDE_REMOVED,
        resource: 'MENUS',
        user_id: actor?.id,
        user_name: this.buildActorName(actor),
        restaurant_id: this.resolveAuditRestaurantId(actor, branchId),
        payload: {
          branchId,
          menuItemId,
        },
        changes: sanitizeAuditChanges({
          before: beforeSnapshot,
        }),
        ip_address: request?.ip,
        user_agent: request?.headers['user-agent'],
      },
      'BranchMenuOverridesService.remove',
    );
    this.auditService.markRequestAsAudited(
      request as unknown as Record<string, unknown>,
    );
  }

  async applyBulk(
    branchId: string,
    dto: BulkBranchMenuOverridesDto,
    actor?: User,
    request?: Request,
  ): Promise<BulkBranchMenuOverridesResult> {
    const branch = await this.restaurantRepository.findOne({
      where: { id: branchId },
      select: ['id', 'brand_id'],
    });

    if (!branch) {
      throw new NotFoundException(`Branch #${branchId} not found`);
    }

    const valueRequiredOps = new Set<BranchOverrideBulkOperation>([
      BranchOverrideBulkOperation.SET_PRICE,
      BranchOverrideBulkOperation.INCREASE_AMOUNT,
      BranchOverrideBulkOperation.DECREASE_AMOUNT,
      BranchOverrideBulkOperation.INCREASE_PERCENT,
      BranchOverrideBulkOperation.DECREASE_PERCENT,
    ]);

    const valueForbiddenOps = new Set<BranchOverrideBulkOperation>([
      BranchOverrideBulkOperation.HIDE,
      BranchOverrideBulkOperation.UNHIDE,
      BranchOverrideBulkOperation.CLEAR_OVERRIDE,
    ]);

    if (
      valueRequiredOps.has(dto.operation) &&
      (dto.value === undefined || Number.isNaN(dto.value))
    ) {
      throw new BadRequestException(
        `"value" is required for operation "${dto.operation}"`,
      );
    }

    if (valueForbiddenOps.has(dto.operation) && dto.value !== undefined) {
      throw new BadRequestException(
        `"value" is not allowed for operation "${dto.operation}"`,
      );
    }

    const items = await this.menuItemRepository.find({
      where: dto.itemIds.map((id) => ({ id })),
      select: ['id', 'price'],
    });
    const itemMap = new Map(items.map((item) => [item.id, item]));

    const existingOverrides = await this.overrideRepository.find({
      where: dto.itemIds.map((menuItemId) => ({
        branch_id: branchId,
        menu_item_id: menuItemId,
      })),
    });
    const existingMap = new Map(
      existingOverrides.map((row) => [row.menu_item_id, row]),
    );

    const failedIds: string[] = [];
    const errorsById: Record<string, string> = {};
    let affectedCount = 0;

    const upserts: BranchMenuOverride[] = [];
    const deletes: string[] = [];

    for (const itemId of dto.itemIds) {
      try {
        const item = itemMap.get(itemId);
        if (!item) {
          throw new NotFoundException(`Menu item #${itemId} not found`);
        }

        const existing = existingMap.get(itemId);

        if (
          dto.operation === BranchOverrideBulkOperation.UNHIDE ||
          dto.operation === BranchOverrideBulkOperation.CLEAR_OVERRIDE
        ) {
          if (existing) {
            deletes.push(existing.id);
            affectedCount += 1;
          }
          continue;
        }

        if (dto.operation === BranchOverrideBulkOperation.HIDE) {
          upserts.push(
            this.overrideRepository.create({
              ...(existing || {}),
              branch_id: branchId,
              menu_item_id: itemId,
              action: 'hide',
              custom_price: null,
            }),
          );
          affectedCount += 1;
          continue;
        }

        const baseValue =
          existing?.custom_price !== null &&
          existing?.custom_price !== undefined
            ? Number(existing.custom_price)
            : Number(item.price);

        const computed = this.computePrice(
          dto.operation,
          baseValue,
          Number(dto.value),
        );

        upserts.push(
          this.overrideRepository.create({
            ...(existing || {}),
            branch_id: branchId,
            menu_item_id: itemId,
            action: 'hide',
            custom_price: computed,
          }),
        );
        affectedCount += 1;
      } catch (error) {
        failedIds.push(itemId);
        errorsById[itemId] =
          error instanceof Error ? error.message : 'Unknown error';
      }
    }

    if (deletes.length) {
      await this.overrideRepository.delete(deletes);
    }

    if (upserts.length) {
      await this.overrideRepository.save(upserts);
    }

    if (affectedCount > 0) {
      if (branch.brand_id) {
        await this.effectiveMenuCacheService.invalidateBrand(branch.brand_id);
      }
      await this.effectiveMenuCacheService.invalidateBranch(branchId);
    }

    await this.auditService.safeEmitLog(
      {
        action: AuditAction.BRANCH_ITEM_OVERRIDE_BULK_APPLIED,
        resource: 'MENUS',
        user_id: actor?.id,
        user_name: this.buildActorName(actor),
        restaurant_id: this.resolveAuditRestaurantId(actor, branchId),
        payload: {
          branchId,
        },
        changes: {
          meta: {
            operation: dto.operation,
            itemCount: dto.itemIds.length,
            affectedCount,
            failedIds,
          },
        },
        ip_address: request?.ip,
        user_agent: request?.headers['user-agent'],
      },
      'BranchMenuOverridesService.applyBulk',
    );
    this.auditService.markRequestAsAudited(
      request as unknown as Record<string, unknown>,
    );

    return {
      affectedCount,
      failedIds,
      ...(failedIds.length ? { errorsById } : {}),
    };
  }

  private computePrice(
    operation: BranchOverrideBulkOperation,
    current: number,
    value: number,
  ): number {
    let next = current;

    switch (operation) {
      case BranchOverrideBulkOperation.SET_PRICE:
        next = value;
        break;
      case BranchOverrideBulkOperation.INCREASE_AMOUNT:
        next = current + value;
        break;
      case BranchOverrideBulkOperation.DECREASE_AMOUNT:
        next = current - value;
        break;
      case BranchOverrideBulkOperation.INCREASE_PERCENT:
        next = current * (1 + value / 100);
        break;
      case BranchOverrideBulkOperation.DECREASE_PERCENT:
        next = current * (1 - value / 100);
        break;
      default:
        return current;
    }

    return Number(Math.max(0, next).toFixed(2));
  }
}
