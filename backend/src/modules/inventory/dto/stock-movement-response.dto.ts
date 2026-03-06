import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MovementType } from '../entities/stock-movement.entity';

export class StockMovementResponseDto {
  /**
   * @source   operations.stock_movements.id
   * @context  inventory hareket satırı kimliği
   * @nullable Hayır
   */
  @ApiProperty({ example: 'movement-uuid' })
  id: string;

  /**
   * @source   operations.stock_movements.ingredient_id
   * @context  hareketin bağlı olduğu malzeme
   * @nullable Hayır
   */
  @ApiProperty({ example: 'ingredient-uuid' })
  ingredient_id: string;

  /**
   * @source   operations.stock_movements.branch_id
   * @context  multi-tenant scope
   * @nullable Hayır — actor.restaurant_id'den set edilir
   */
  @ApiProperty({ example: 'branch-uuid' })
  branch_id: string;

  /**
   * @source   operations.stock_movements.type
   * @context  giriş/çıkış/düzeltme hareket tipi
   * @nullable Hayır
   */
  @ApiProperty({ enum: MovementType, example: MovementType.IN })
  type: MovementType;

  /**
   * @source   operations.stock_movements.quantity
   * @context  kullanıcının girdiği birimde gösterim
   * @nullable Hayır
   */
  @ApiProperty({ example: 10 })
  quantity: number;

  /**
   * @source   operations.stock_movements.unit
   * @context  UI gösterimi
   * @nullable Evet — eski kayıtlarda boş olabilir
   */
  @ApiPropertyOptional({ example: 'kg' })
  unit?: string | null;

  /**
   * @source   operations.stock_movements.base_quantity
   * @context  stok hesabı için normalize edilmiş miktar
   * @nullable Evet — eski kayıtlarda boş olabilir
   */
  @ApiPropertyOptional({ example: 10000 })
  base_quantity?: number | null;

  /**
   * @source   operations.stock_movements.reason
   * @context  kullanıcı açıklaması
   * @nullable Evet — opsiyonel giriş
   */
  @ApiPropertyOptional({ example: 'Haftalık sayım düzeltmesi' })
  reason?: string | null;

  /**
   * @source   operations.stock_movements.unit_price
   * @context  sadece giriş hareketlerinde maliyet izleme
   * @nullable Evet — OUT/ADJUST hareketlerinde null
   */
  @ApiPropertyOptional({ example: 45.5 })
  unit_price?: number | null;

  /**
   * @source   operations.stock_movements.supplier_id
   * @context  tedarikçi bazlı maliyet takibi
   * @nullable Evet — tedarikçi seçilmediyse null
   */
  @ApiPropertyOptional({ example: 'supplier-uuid' })
  supplier_id?: string | null;

  /**
   * @source   operations.stock_movements.created_at
   * @context  hareket geçmişi sıralama ve filtreleme
   * @nullable Hayır
   */
  @ApiProperty({ example: '2026-03-06T08:15:00.000Z' })
  created_at: Date;
}
