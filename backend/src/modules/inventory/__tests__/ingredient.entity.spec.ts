import { Ingredient } from '../entities/ingredient.entity';

describe('Ingredient.updateCosts', () => {
  let ingredient: Ingredient;

  beforeEach(() => {
    ingredient = new Ingredient();
    ingredient.average_cost = 0;
    ingredient.last_price = 0;
  });

  describe('updateCosts', () => {
    it('should set average_cost to new price when current stock and cost are 0 (first input)', () => {
      // İlk giriş: mevcut stok ve maliyet 0
      ingredient.updateCosts(10, 100, 0);

      expect(ingredient.average_cost).toBe(100);
      expect(ingredient.last_price).toBe(100);
    });

    it('should calculate weighted average when stock exists', () => {
      // Mevcut: 100 kg @ 50 TL/kg = 5000 TL
      ingredient.average_cost = 50;
      ingredient.last_price = 50;

      // Yeni giriş: 10 kg @ 100 TL/kg = 1000 TL
      // Toplam: 110 kg @ 6000 TL = 54.54 TL/kg
      ingredient.updateCosts(10, 100, 100);

      expect(Number(ingredient.average_cost)).toBeCloseTo(54.55, 1);
      expect(ingredient.last_price).toBe(100);
    });

    it('should always update last_price regardless of current stock', () => {
      ingredient.average_cost = 50;
      ingredient.last_price = 50;

      // last_price her zaman güncellenmeli
      ingredient.updateCosts(5, 200, 100);

      expect(ingredient.last_price).toBe(200);
      expect(ingredient.average_cost).toBeCloseTo(59.09, 1);
    });

    it('should handle zero quantity addition gracefully', () => {
      ingredient.average_cost = 50;
      ingredient.last_price = 50;

      // Sıfır miktar ekleme
      ingredient.updateCosts(0, 100, 100);

      // Maliyet değişmez, sadece last_price güncellenir
      expect(ingredient.average_cost).toBe(50);
      expect(ingredient.last_price).toBe(100);
    });

    it('should handle decimal quantities correctly', () => {
      ingredient.average_cost = 10; // 10 TL/kg
      ingredient.last_price = 10;

      // 5.5 kg @ 20 TL/kg giriş
      // (10 * 10) + (5.5 * 20) = 100 + 110 = 210 / 15.5 = 13.55
      ingredient.updateCosts(5.5, 20, 10);

      expect(Number(ingredient.average_cost)).toBeCloseTo(13.55, 2);
    });

    it('should handle multiple sequential inputs correctly', () => {
      // İlk giriş
      ingredient.updateCosts(10, 100, 0);
      expect(ingredient.average_cost).toBe(100);
      expect(ingredient.last_price).toBe(100);

      // İkinci giriş: 10 kg @ 100 TL + 20 kg @ 50 TL = 2000 / 30 = 66.67
      // Ancak mevcut stock 10, yeni giriş 20
      ingredient.updateCosts(20, 50, 10);
      expect(Number(ingredient.average_cost)).toBeCloseTo(66.67, 1);
      expect(ingredient.last_price).toBe(50);

      // Üçüncü giriş: 30 kg @ 75 TL
      // 30 kg @ 66.67 + 20 kg @ 50 = 3001 / 60 = 50.02
      ingredient.updateCosts(20, 75, 30);
      expect(Number(ingredient.average_cost)).toBeCloseTo(64.17, 1);
      expect(ingredient.last_price).toBe(75);
    });

    it('should handle large quantities correctly', () => {
      ingredient.average_cost = 25;
      ingredient.last_price = 25;

      // Büyük miktar
      ingredient.updateCosts(1000, 30, 500);

      // (500 * 25) + (1000 * 30) = 12500 + 30000 = 42500 / 1500 = 28.33
      expect(Number(ingredient.average_cost)).toBeCloseTo(28.33, 2);
    });

    it('should return early when total quantity is zero (prevent division by zero)', () => {
      // Mevcut stock 0 ve yeni miktar 0
      ingredient.average_cost = 50;
      ingredient.last_price = 50;

      ingredient.updateCosts(0, 100, 0);

      // Hiçbir şey değişmemeli
      expect(ingredient.average_cost).toBe(50);
      expect(ingredient.last_price).toBe(50);
    });
  });
});
