import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BranchMenuOverride } from '../entities/branch-menu-override.entity';
import { MenuItem } from '../entities/menu-item.entity';
import { Restaurant } from '../../restaurants/entities/restaurant.entity';
import { UpsertBranchMenuOverrideDto } from '../dto/upsert-branch-menu-override.dto';
import { EffectiveMenuCacheService } from './effective-menu-cache.service';

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
  ) {}

  async upsert(
    branchId: string,
    menuItemId: string,
    dto: UpsertBranchMenuOverrideDto,
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

    const saved = await this.overrideRepository.save(
      this.overrideRepository.create({
        ...(existing || {}),
        branch_id: branchId,
        menu_item_id: menuItemId,
        action: 'hide',
        custom_price:
          dto.custom_price !== undefined ? dto.custom_price : existing?.custom_price ?? null,
      }),
    );

    if (branch.brand_id) {
      await this.effectiveMenuCacheService.invalidateBrand(branch.brand_id);
    }
    await this.effectiveMenuCacheService.invalidateBranch(branchId);

    return saved;
  }

  async remove(branchId: string, menuItemId: string): Promise<void> {
    const existing = await this.overrideRepository.findOne({
      where: { branch_id: branchId, menu_item_id: menuItemId },
      relations: ['branch'],
    });

    if (!existing) {
      return;
    }

    await this.overrideRepository.delete(existing.id);
    if (existing.branch?.brand_id) {
      await this.effectiveMenuCacheService.invalidateBrand(existing.branch.brand_id);
    }
    await this.effectiveMenuCacheService.invalidateBranch(branchId);
  }
}
