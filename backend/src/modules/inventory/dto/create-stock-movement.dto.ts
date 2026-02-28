import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsEnum,
  IsOptional,
  Min,
  ValidateIf,
} from 'class-validator';
import { MovementType } from '../entities/stock-movement.entity';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateStockMovementDto {
  @ApiProperty({ description: 'Malzeme ID' })
  @IsString()
  @IsNotEmpty()
  ingredient_id: string;

  @ApiProperty({
    enum: MovementType,
    description: 'Hareket tipi (IN, OUT, ADJUST)',
  })
  @IsEnum(MovementType)
  @IsNotEmpty()
  type: MovementType;

  @ApiProperty({ description: 'Miktar' })
  @IsNumber()
  @Min(0.001)
  @IsNotEmpty()
  quantity: number;

  @ApiPropertyOptional({
    description: 'Hareket nedeni (SALE, PURCHASE, WASTE, COUNT, ADJUSTMENT)',
  })
  @IsString()
  @IsOptional()
  reason?: string;

  @ApiPropertyOptional({
    description: 'Referans ID (order_id, purchase_id vb.)',
  })
  @IsString()
  @IsOptional()
  reference_id?: string;

  // unit_price sadece IN hareketlerinde izinli
  @ApiPropertyOptional({
    description: 'Birim fiyat (sadece GİRİŞ hareketlerinde zorunlu)',
  })
  @ValidateIf((o) => o.type === MovementType.IN)
  @IsNumber()
  @Min(0)
  @IsNotEmpty({ message: 'Giriş hareketleri için birim fiyat zorunludur' })
  unit_price?: number;

  @ApiPropertyOptional({ description: 'Tedarikçi ID (giriş hareketlerinde)' })
  @IsString()
  @IsOptional()
  supplier_id?: string;

  @ApiPropertyOptional({ example: 'uuid-v4-transaction-id' })
  @IsString()
  @IsOptional()
  transaction_id?: string;
}
