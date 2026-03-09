import { ApiProperty } from '@nestjs/swagger';

export class AreaResponseDto {
  /** @source business.areas.id */
  @ApiProperty()
  id: string;

  /** @source business.areas.name */
  @ApiProperty()
  name: string;

  /** @source business.areas.restaurant_id */
  @ApiProperty()
  restaurant_id: string;
}
