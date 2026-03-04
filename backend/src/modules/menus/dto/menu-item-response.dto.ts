import { ApiProperty } from '@nestjs/swagger';
import { MenuItem } from '../entities/menu-item.entity';
import { MenuItemAvailabilityStatus } from '../enums/menu-item-availability-status.enum';
import { normalizeImageUrl } from '../utils/image-url.transformer';

export class MenuItemResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ required: false })
  description: string;

  @ApiProperty()
  price: number;

  @ApiProperty({ required: false })
  image_url: string;

  @ApiProperty()
  is_available: boolean;

  @ApiProperty()
  track_inventory: boolean;

  @ApiProperty()
  category_id: string;

  @ApiProperty()
  created_at: Date;

  @ApiProperty()
  updated_at: Date;

  @ApiProperty({ required: false })
  recipes: any[];

  @ApiProperty({ enum: MenuItemAvailabilityStatus })
  availabilityStatus: MenuItemAvailabilityStatus;

  static fromEntity(
    entity: MenuItem,
    availabilityStatus?: MenuItemAvailabilityStatus,
    customPrice?: number | null,
  ): MenuItemResponseDto {
    return {
      ...entity,
      ...(customPrice !== undefined && customPrice !== null
        ? { price: Number(customPrice) }
        : {}),
      image_url: normalizeImageUrl(entity.image_url),
      ...(availabilityStatus ? { availabilityStatus } : {}),
    } as MenuItemResponseDto;
  }
}
