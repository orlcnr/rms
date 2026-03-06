import { ApiProperty } from '@nestjs/swagger';

export class BulkUpdateStockUpdatedItemDto {
  /**
   * @source   BulkUpdateStockUseCase başarılı transaction satırı
   * @context  inventory — hızlı sayım sonucu
   * @nullable Hayır
   */
  @ApiProperty({ example: 'ingredient-uuid' })
  ingredientId: string;

  /**
   * @source   update.newQuantity (persist edilen değer)
   * @context  inventory — hızlı sayım sonucu
   * @nullable Hayır
   */
  @ApiProperty({ example: 42.5 })
  newQty: number;
}

export class BulkUpdateStockFailedItemDto {
  /**
   * @source   BulkUpdateStockUseCase başarısız transaction satırı
   * @context  inventory — hızlı sayım hata teşhisi
   * @nullable Hayır
   */
  @ApiProperty({ example: 'ingredient-uuid' })
  ingredientId: string;

  /**
   * @source   yakalanan hata mesajı (domain/validation)
   * @context  inventory — satır bazlı hata gösterimi
   * @nullable Hayır
   */
  @ApiProperty({ example: 'Ingredient not found' })
  reason: string;
}

export class BulkUpdateStockResponseDto {
  /**
   * @source   başarılı satırlar listesi
   * @context  inventory — hızlı sayım sonucu
   * @nullable Hayır (boş olabilir)
   */
  @ApiProperty({ type: [BulkUpdateStockUpdatedItemDto] })
  updated: BulkUpdateStockUpdatedItemDto[];

  /**
   * @source   başarısız satırlar listesi
   * @context  inventory — hızlı sayım sonucu
   * @nullable Hayır (boş olabilir)
   */
  @ApiProperty({ type: [BulkUpdateStockFailedItemDto] })
  failed: BulkUpdateStockFailedItemDto[];
}
