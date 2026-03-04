import { MenuItem } from '../../entities/menu-item.entity';
import { MenuItemAvailabilityStatus } from '../../enums/menu-item-availability-status.enum';
import { AvailabilityStrategy } from './availability-strategy.interface';

export class UntrackedAvailabilityStrategy implements AvailabilityStrategy {
  calculate(item: MenuItem): MenuItemAvailabilityStatus {
    return item.is_available
      ? MenuItemAvailabilityStatus.AVAILABLE
      : MenuItemAvailabilityStatus.OUT_OF_STOCK;
  }
}
