import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class IngredientStockResponseDto {
  /**
   * @source   operations.branch_stocks.quantity WHERE branch_id = activeBranch
   * @context  inventory/sales — aktif şube stok gösterimi
   * @nullable Hayır — branch satırı yoksa 0 döner
   */
  @ApiProperty({ example: 12.5 })
  quantity: number;
}

export class IngredientResponseDto {
  /**
   * @source   operations.ingredients.id
   * @context  inventory — ingredient kimliği
   * @nullable Hayır
   */
  @ApiProperty({ example: 'ingredient-uuid' })
  id: string;

  /**
   * @source   operations.ingredients.name
   * @context  inventory/sales
   * @nullable Hayır
   */
  @ApiProperty({ example: 'Domates' })
  name: string;

  /**
   * @source   operations.ingredients.unit
   * @context  inventory form ve liste gösterimi
   * @nullable Hayır
   */
  @ApiProperty({ example: 'kg' })
  unit: string;

  /**
   * @source   operations.ingredients.base_unit (normalizeBaseUnit)
   * @context  stok hesaplama ve birim dönüşüm
   * @nullable Evet — legacy kayıtlar için null olabilir
   */
  @ApiPropertyOptional({ example: 'gr' })
  base_unit?: string | null;

  /**
   * @source   operations.ingredients.unit_group
   * @context  birim uyumluluk kontrolü
   * @nullable Evet — legacy kayıtlar için null olabilir
   */
  @ApiPropertyOptional({ example: 'mass' })
  unit_group?: string | null;

  /**
   * @source   operations.ingredients.pack_size
   * @context  paketten base birime dönüşüm
   * @nullable Evet — set edilmemişse null olabilir
   */
  @ApiPropertyOptional({ example: 1 })
  pack_size?: number | null;

  /**
   * @source   operations.ingredients.critical_level
   * @context  kritik stok hesaplama
   * @nullable Hayır
   */
  @ApiProperty({ example: 5 })
  critical_level: number;

  /**
   * @source   operations.branch_stocks.quantity (aktif şube bağlamında)
   * @context  inventory liste/detail stok gösterimi
   * @nullable Evet — relation yüklenmediyse null olabilir
   */
  @ApiPropertyOptional({ type: IngredientStockResponseDto })
  stock?: IngredientStockResponseDto | null;

  /**
   * @source   operations.branch_ingredient_costs.average_cost
   * @context  maliyet analizi ve food-cost hesapları
   * @nullable Evet — maliyet hareketi yoksa null
   */
  @ApiPropertyOptional({ example: 45.25 })
  average_cost?: number | null;

  /**
   * @source   operations.branch_ingredient_costs.last_price
   * @context  son alış fiyatı gösterimi
   * @nullable Evet — ilk alıştan önce null
   */
  @ApiPropertyOptional({ example: 50.1 })
  last_price?: number | null;

  /**
   * @source   operations.branch_ingredient_costs.previous_price
   * @context  fiyat değişimi karşılaştırması
   * @nullable Evet — önceki fiyat yoksa null
   */
  @ApiPropertyOptional({ example: 46.8 })
  previous_price?: number | null;

  /**
   * @source   operations.branch_ingredient_costs.price_updated_at
   * @context  maliyet değişim zaman damgası
   * @nullable Evet — henüz güncelleme yoksa null
   */
  @ApiPropertyOptional({ example: '2026-03-06T08:15:00.000Z' })
  price_updated_at?: Date | null;
}
