import { Entity, Column, Index, OneToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Stock } from './stock.entity';

@Entity('ingredients', { schema: 'operations' })
export class Ingredient extends BaseEntity {
  @Column()
  name: string;

  @Column()
  unit: string; // kg, gr, adet, lt, vb.

  @Column({ type: 'decimal', precision: 10, scale: 3, default: 0 })
  critical_level: number;

  @Index()
  @Column()
  restaurant_id: string;

  // Maliyet alanları
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  average_cost: number; // Ortalama maliyet

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  last_price: number; // Son alış fiyatı

  // Fiyat geçmişi takibi için yeni alanlar
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  previous_price: number; // Önceki fiyat (analiz için)

  @Column({ type: 'timestamp', nullable: true })
  price_updated_at: Date; // Fiyat güncelleme tarihi

  @OneToOne(() => Stock, (stock) => stock.ingredient)
  stock: Stock;

  /**
   * Malzeme maliyetlerini güncelleyen domain metodu (WAC - Weighted Average Cost)
   *
   * Business Logic:
   * - Stock IN (giriş) hareketlerinde çalışır
   * - Önceki fiyatı yedekler (previous_price)
   * - Ağırlıklı ortalama maliyeti hesaplar
   * - Son alış fiyatını ve güncelleme tarihini kaydeder
   *
   * @param newQuantity - Yeni eklenen miktar
   * @param newUnitPrice - Yeni birim fiyatı
   * @param currentStockQuantity - Mevcut stok miktarı
   */
  updateCosts(
    newQuantity: number,
    newUnitPrice: number,
    currentStockQuantity: number,
  ): void {
    // 1. Önceki fiyatı yedekle (analiz için)
    this.previous_price = this.last_price;

    // Sıfıra bölünme kontrolü
    const totalQuantity = currentStockQuantity + newQuantity;
    if (totalQuantity === 0) {
      return;
    }

    const currentAverageCost = Number(this.average_cost) || 0;
    const currentStock = Number(currentStockQuantity);

    if (currentStock === 0 && currentAverageCost === 0) {
      // İlk giriş - direkt yeni fiyatı ortalama maliyet yap
      this.average_cost = newUnitPrice;
    } else if (currentStock > 0) {
      // Ağırlıklı ortalama hesaplama
      // Formül: ((mevcutStok * ortalamaMaliyet) + (yeniMiktar * yeniFiyat)) / (mevcutStok + yeniMiktar)
      const totalCost =
        currentStock * currentAverageCost + newQuantity * newUnitPrice;
      this.average_cost = Number((totalCost / totalQuantity).toFixed(2));
    }

    // 2. Son alış fiyatını güncelle
    this.last_price = newUnitPrice;

    // 3. Fiyat güncelleme tarihini kaydet
    this.price_updated_at = new Date();
  }
}
