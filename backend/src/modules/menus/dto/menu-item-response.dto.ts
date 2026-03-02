import { ApiProperty } from '@nestjs/swagger';
import { MenuItem } from '../entities/menu-item.entity';
import { Exclude, Expose, Transform } from 'class-transformer';
import { MenuItemAvailabilityStatus } from '../enums/menu-item-availability-status.enum';

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

  constructor(partial: Partial<MenuItem>) {
    Object.assign(this, partial);
    this.transformImageUrl();
  }

  private transformImageUrl() {
    if (!this.image_url) return;

    const domain = process.env.FILE_DOMAIN || 'https://api.localhost';

    if (this.image_url.startsWith('http')) {
      // Eğer URL http://api.localhost ile başlıyorsa ve domain https ise güncelle
      if (
        this.image_url.includes('api.localhost') &&
        !this.image_url.startsWith(domain)
      ) {
        this.image_url = this.image_url.replace(
          /https?:\/\/api\.localhost/,
          domain,
        );
      }
    } else {
      // Göreceli path ise domain'i başına ekle
      this.image_url = `${domain}${this.image_url.startsWith('/') ? '' : '/'}${this.image_url}`;
    }
  }

  static fromEntity(
    entity: MenuItem,
    availabilityStatus?: MenuItemAvailabilityStatus,
  ): MenuItemResponseDto {
    const dto = new MenuItemResponseDto(entity);
    if (availabilityStatus) {
      dto.availabilityStatus = availabilityStatus;
    }
    return dto;
  }
}
