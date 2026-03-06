import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';
import { GetMenuItemsDto } from './get-menu-items.dto';

export enum BranchItemVisibility {
  ALL = 'all',
  VISIBLE = 'visible',
  HIDDEN = 'hidden',
}

export class GetBranchMenuItemsDto extends GetMenuItemsDto {
  @ApiPropertyOptional({
    enum: BranchItemVisibility,
    default: BranchItemVisibility.ALL,
  })
  @IsEnum(BranchItemVisibility)
  @IsOptional()
  visibility?: BranchItemVisibility = BranchItemVisibility.ALL;

  @ApiPropertyOptional({
    default: false,
    description:
      'When true, only items that have explicit branch_menu_overrides row are returned.',
  })
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  @IsOptional()
  overrideOnly?: boolean = false;
}
