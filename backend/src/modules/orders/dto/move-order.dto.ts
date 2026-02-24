import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsNotEmpty } from 'class-validator';

export class MoveOrderDto {
  @ApiProperty({
    example: 'uuid-of-new-table',
    description: "Siparişin taşınacağı yeni masanın UUID'si",
  })
  @IsUUID()
  @IsNotEmpty()
  new_table_id: string;
}
