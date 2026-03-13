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
  base_price?: number;

  @ApiProperty({ required: false })
  effective_price?: number;

  @ApiProperty({
    required: false,
    type: Object,
    example: { is_hidden: false, custom_price: null },
  })
  override?: {
    is_hidden: boolean;
    custom_price: number | null;
  };

  @ApiProperty({ required: false })
  image_url: string;

  @ApiProperty()
  is_available: boolean;

  @ApiProperty()
  track_inventory: boolean;

  @ApiProperty()
  requires_kitchen: boolean;

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
    override?: { is_hidden: boolean; custom_price: number | null },
    options?: { branchContext?: boolean },
  ): MenuItemResponseDto {
    const effectivePrice =
      customPrice !== undefined && customPrice !== null
        ? Number(customPrice)
        : Number(entity.price);
    const hasBranchPricingContext =
      Boolean(options?.branchContext) ||
      customPrice !== undefined ||
      Boolean(override);

    return {
      ...entity,
      price: effectivePrice,
      ...(override ? { override } : {}),
      ...(hasBranchPricingContext
        ? {
            // These fields are populated when response is generated
            // with branch/effective pricing context.
            base_price: Number(entity.price),
            effective_price: effectivePrice,
          }
        : {}),
      image_url: normalizeImageUrl(entity.image_url),
      ...(availabilityStatus ? { availabilityStatus } : {}),
    } as MenuItemResponseDto;
  }
}
