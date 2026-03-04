import { MenuItem } from '../../entities/menu-item.entity';
import { MenuItemAvailabilityStatus } from '../../enums/menu-item-availability-status.enum';

export interface AvailabilityStrategy {
  calculate(item: MenuItem): MenuItemAvailabilityStatus;
}
