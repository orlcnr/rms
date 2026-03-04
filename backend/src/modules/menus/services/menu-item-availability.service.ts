import { Injectable } from '@nestjs/common';
import { MenuItem } from '../entities/menu-item.entity';
import { MenuItemAvailabilityStatus } from '../enums/menu-item-availability-status.enum';
import { RulesService } from '../../rules/rules.service';
import { RuleKey } from '../../rules/enums/rule-key.enum';
import { RecipeBasedAvailabilityStrategy } from './availability/recipe-based-availability.strategy';
import { UntrackedAvailabilityStrategy } from './availability/untracked-availability.strategy';

@Injectable()
export class MenuItemAvailabilityService {
  private readonly defaultThreshold = 5;

  constructor(private readonly rulesService: RulesService) {}

  private async resolveThreshold(restaurantId: string): Promise<number> {
    const rule = await this.rulesService.getRule(
      restaurantId,
      RuleKey.INVENTORY_LOW_STOCK_ALERT,
    );

    const threshold = Number(rule?.config?.threshold);
    return Number.isFinite(threshold) && threshold > 0
      ? threshold
      : this.defaultThreshold;
  }

  async resolve(
    item: MenuItem,
    restaurantId: string,
  ): Promise<MenuItemAvailabilityStatus> {
    const threshold = await this.resolveThreshold(restaurantId);
    return this.resolveWithThreshold(item, threshold);
  }

  async resolveMany(
    items: MenuItem[],
    restaurantId: string,
  ): Promise<Map<string, MenuItemAvailabilityStatus>> {
    const threshold = await this.resolveThreshold(restaurantId);
    const results = new Map<string, MenuItemAvailabilityStatus>();

    for (const item of items) {
      results.set(item.id, this.resolveWithThreshold(item, threshold));
    }

    return results;
  }

  private resolveWithThreshold(
    item: MenuItem,
    threshold: number,
  ): MenuItemAvailabilityStatus {
    const strategy = item.track_inventory
      ? new RecipeBasedAvailabilityStrategy(threshold)
      : new UntrackedAvailabilityStrategy();

    return strategy.calculate(item);
  }
}
