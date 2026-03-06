import { ApiProperty } from '@nestjs/swagger';

export class IngredientUsageProductDto {
  /**
   * @source   operations.recipes.product_id
   * @context  ingredient kullanım kırılımı
   * @nullable Hayır
   */
  @ApiProperty({ example: 'product-uuid' })
  product_id: string;

  /**
   * @source   product.name relation alanı
   * @context  ingredient kullanım kırılımı
   * @nullable Hayır
   */
  @ApiProperty({ example: 'Margherita Pizza' })
  product_name: string;

  /**
   * @source   operations.recipes.quantity
   * @context  ürün başına kullanılan malzeme miktarı
   * @nullable Hayır
   */
  @ApiProperty({ example: 0.25 })
  quantity: number;

  /**
   * @source   menu_items.price
   * @context  maliyet etki analizi
   * @nullable Hayır
   */
  @ApiProperty({ example: 320 })
  product_price: number;
}

export class IngredientUsageResponseDto {
  /**
   * @source   ingredient entity projection
   * @context  ingredient detail kullanım özeti
   * @nullable Hayır
   */
  @ApiProperty({
    example: { id: 'ingredient-uuid', name: 'Domates', unit: 'kg' },
  })
  ingredient: {
    id: string;
    name: string;
    unit: string;
  };

  /**
   * @source   recipes + products join sonucu
   * @context  ingredient usage raporu
   * @nullable Hayır (boş olabilir)
   */
  @ApiProperty({ type: [IngredientUsageProductDto] })
  products: IngredientUsageProductDto[];

  /**
   * @source   products.length hesaplaması
   * @context  ingredient usage raporu
   * @nullable Hayır
   */
  @ApiProperty({ example: 3 })
  total_products_affected: number;
}

export class CostImpactResponseDto {
  /**
   * @source   operations.branch_ingredient_costs.ingredient_id
   * @context  maliyet etki listesi
   * @nullable Hayır
   */
  @ApiProperty({ example: 'ingredient-uuid' })
  ingredient_id: string;

  /**
   * @source   ingredient.name relation alanı
   * @context  maliyet etki listesi
   * @nullable Hayır
   */
  @ApiProperty({ example: 'Kaşar Peyniri' })
  ingredient_name: string;

  /**
   * @source   ingredient.unit relation alanı
   * @context  maliyet etki listesi
   * @nullable Hayır
   */
  @ApiProperty({ example: 'kg' })
  unit: string;

  /**
   * @source   branch_cost.previous_price
   * @context  maliyet değişim hesaplaması
   * @nullable Hayır
   */
  @ApiProperty({ example: 140 })
  previous_price: number;

  /**
   * @source   branch_cost.last_price
   * @context  maliyet değişim hesaplaması
   * @nullable Hayır
   */
  @ApiProperty({ example: 165 })
  current_price: number;

  /**
   * @source   current_price - previous_price
   * @context  maliyet etki listesi
   * @nullable Hayır
   */
  @ApiProperty({ example: 25 })
  price_change: number;

  /**
   * @source   (price_change / previous_price) * 100
   * @context  maliyet etki listesi
   * @nullable Hayır
   */
  @ApiProperty({ example: 17.86 })
  price_change_percent: number;

  /**
   * @source   stock_movements OUT toplamı (son 30 gün)
   * @context  aylık tüketim göstergesi
   * @nullable Hayır
   */
  @ApiProperty({ example: 52.4 })
  monthly_consumption: number;

  /**
   * @source   price_change * monthly_consumption
   * @context  toplam maliyet etki hesaplaması
   * @nullable Hayır
   */
  @ApiProperty({ example: 1310 })
  cost_impact: number;
}

export class CountDifferenceResponseDto {
  /**
   * @source   operations.stock_movements.ingredient_id
   * @context  sayım farkı satırı
   * @nullable Hayır
   */
  @ApiProperty({ example: 'ingredient-uuid' })
  ingredient_id: string;

  /**
   * @source   ingredient.name relation alanı
   * @context  sayım farkı satırı
   * @nullable Hayır
   */
  @ApiProperty({ example: 'Domates' })
  ingredient_name: string;

  /**
   * @source   movement.created_at
   * @context  sayım tarih kırılımı
   * @nullable Hayır
   */
  @ApiProperty({ example: '2026-03-06T08:15:00.000Z' })
  count_date: string;

  /**
   * @source   hesaplanmış placeholder (tek hareketten türetilemez)
   * @context  sayım farkı raporu
   * @nullable Hayır
   */
  @ApiProperty({ example: 0 })
  system_quantity: number;

  /**
   * @source   movement.type + movement.quantity hesaplaması
   * @context  sayım farkı raporu
   * @nullable Hayır
   */
  @ApiProperty({ example: 3 })
  counted_quantity: number;

  /**
   * @source   counted_quantity - system_quantity (bu akışta signed quantity)
   * @context  sayım farkı raporu
   * @nullable Hayır
   */
  @ApiProperty({ example: 3 })
  difference_quantity: number;

  /**
   * @source   difference_quantity * average_cost
   * @context  TL bazlı fark etkisi
   * @nullable Hayır
   */
  @ApiProperty({ example: 120 })
  difference_try: number;

  /**
   * @source   ingredient.unit relation alanı
   * @context  fark miktarı birim gösterimi
   * @nullable Hayır
   */
  @ApiProperty({ example: 'kg' })
  unit: string;
}

export class FoodCostAlertResponseDto {
  /**
   * @source   menu_items.id
   * @context  food-cost alarm listesi
   * @nullable Hayır
   */
  @ApiProperty({ example: 'product-uuid' })
  product_id: string;

  /**
   * @source   menu_items.name
   * @context  food-cost alarm listesi
   * @nullable Hayır
   */
  @ApiProperty({ example: 'Cheeseburger' })
  product_name: string;

  /**
   * @source   menu_items.price
   * @context  food-cost alarm listesi
   * @nullable Hayır
   */
  @ApiProperty({ example: 280 })
  current_price: number;

  /**
   * @source   recipe ingredient cost toplamı
   * @context  food-cost alarm listesi
   * @nullable Hayır
   */
  @ApiProperty({ example: 128 })
  recipe_cost: number;

  /**
   * @source   (recipe_cost / current_price) * 100
   * @context  alarm eşiği karşılaştırması
   * @nullable Hayır
   */
  @ApiProperty({ example: 45.71 })
  food_cost_percent: number;

  /**
   * @source   recipe_cost / (threshold / 100)
   * @context  önerilen satış fiyatı
   * @nullable Hayır
   */
  @ApiProperty({ example: 365.71 })
  suggested_price: number;
}
