import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsNotEmpty, IsOptional, IsIn } from 'class-validator';

const OCCUPIED_BEHAVIOR_OPTIONS = ['reject', 'merge'] as const;

export class MoveOrderDto {
  @ApiProperty({
    example: 'uuid-of-new-table',
    description: "Siparişin taşınacağı yeni masanın UUID'si",
  })
  @IsUUID()
  @IsNotEmpty()
  new_table_id: string;

  @ApiProperty({
    required: false,
    enum: OCCUPIED_BEHAVIOR_OPTIONS,
    default: 'reject',
    description: 'Hedef masa doluysa davranış seçimi',
  })
  @IsOptional()
  @IsIn(OCCUPIED_BEHAVIOR_OPTIONS)
  on_target_occupied?: (typeof OCCUPIED_BEHAVIOR_OPTIONS)[number];
}
