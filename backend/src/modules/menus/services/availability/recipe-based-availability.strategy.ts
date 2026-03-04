import { MenuItem } from '../../entities/menu-item.entity';
import { MenuItemAvailabilityStatus } from '../../enums/menu-item-availability-status.enum';
import { AvailabilityStrategy } from './availability-strategy.interface';

export class RecipeBasedAvailabilityStrategy implements AvailabilityStrategy {
  constructor(private readonly threshold: number) {}

  calculate(item: MenuItem): MenuItemAvailabilityStatus {
    if (!item.recipes?.length) {
      return MenuItemAvailabilityStatus.OUT_OF_STOCK;
    }

    const maxProducible = Math.min(
      ...item.recipes.map((recipe) => {
        const stock = Number(recipe.ingredient?.stock?.quantity || 0);
        const quantity = Number(recipe.quantity || 0);
        return quantity <= 0 ? 0 : Math.floor(stock / quantity);
      }),
    );

    if (maxProducible <= 0) {
      return MenuItemAvailabilityStatus.OUT_OF_STOCK;
    }

    if (maxProducible <= this.threshold) {
      return MenuItemAvailabilityStatus.LIMITED_STOCK;
    }

    return MenuItemAvailabilityStatus.AVAILABLE;
  }
}
