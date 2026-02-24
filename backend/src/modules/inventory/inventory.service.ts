import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Repository,
  DataSource,
  QueryRunner,
  SelectQueryBuilder,
} from 'typeorm';
import { Ingredient } from './entities/ingredient.entity';
import { Stock } from './entities/stock.entity';
import { Recipe } from './entities/recipe.entity';
import { StockMovement, MovementType } from './entities/stock-movement.entity';
import { MenuItem } from '../menus/entities/menu-item.entity';
import { CreateIngredientDto } from './dto/create-ingredient.dto';
import { CreateStockMovementDto } from './dto/create-stock-movement.dto';
import { CreateRecipeDto } from './dto/create-recipe.dto';
import { GetStockMovementsDto } from './dto/get-stock-movements.dto';
import { GetIngredientsDto } from './dto/get-ingredients.dto';
import { Order } from '../orders/entities/order.entity';
import {
  paginate,
  IPaginationOptions,
  Pagination,
} from 'nestjs-typeorm-paginate';
import { RulesService } from '../rules/rules.service';
import { RuleKey } from '../rules/enums/rule-key.enum';
import { StockStatus } from './enums/stock-status.enum';

@Injectable()
export class InventoryService {
  constructor(
    @InjectRepository(Ingredient)
    private ingredientRepository: Repository<Ingredient>,
    @InjectRepository(Stock)
    private stockRepository: Repository<Stock>,
    @InjectRepository(Recipe)
    private recipeRepository: Repository<Recipe>,
    @InjectRepository(StockMovement)
    private movementRepository: Repository<StockMovement>,
    @InjectRepository(MenuItem)
    private menuItemRepository: Repository<MenuItem>,
    private rulesService: RulesService,
    private dataSource: DataSource,
  ) { }

  // Ingredients
  async createIngredient(
    createIngredientDto: CreateIngredientDto,
  ): Promise<Ingredient> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const ingredient = this.ingredientRepository.create(createIngredientDto);
      const savedIngredient = await queryRunner.manager.save(ingredient);

      // Her yeni malzeme için boş bir stok kaydı oluştur
      await queryRunner.manager.save(Stock, {
        ingredient_id: savedIngredient.id,
        quantity: 0,
      });

      await queryRunner.commitTransaction();
      return savedIngredient;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async findAllIngredients(
    req: any,
    filters: GetIngredientsDto,
  ): Promise<Pagination<Ingredient>> {
    const restaurantId = req.user.restaurantId;
    if (!restaurantId) {
      throw new BadRequestException('Restaurant ID is required');
    }

    const queryBuilder = this.ingredientRepository
      .createQueryBuilder('ingredient')
      .leftJoinAndSelect('ingredient.stock', 'stock')
      .where('ingredient.restaurant_id = :restaurantId', { restaurantId });

    if (filters.name) {
      queryBuilder.andWhere('ingredient.name ILIKE :name', {
        name: `%${filters.name}%`,
      });
    }

    if (filters.status === StockStatus.CRITICAL) {
      // Kritik Seviye: 0 < quantity <= critical_level
      queryBuilder.andWhere('COALESCE(stock.quantity, 0) > 0');
      queryBuilder.andWhere('COALESCE(stock.quantity, 0) <= ingredient.critical_level');
    } else if (filters.status === StockStatus.OUT_OF_STOCK) {
      // Stok Tükendi: quantity <= 0
      queryBuilder.andWhere('COALESCE(stock.quantity, 0) <= 0');
    } else if (filters.status === StockStatus.HEALTHY) {
      // Yeterli Stok: quantity > critical_level
      queryBuilder.andWhere('COALESCE(stock.quantity, 0) > ingredient.critical_level');
    }

    queryBuilder.orderBy('ingredient.name', 'ASC');

    return paginate<Ingredient>(queryBuilder, {
      page: filters.page ?? 1,
      limit: filters.limit ?? 10,
    });
  }

  async findOneIngredient(id: string): Promise<Ingredient> {
    const ingredient = await this.ingredientRepository.findOne({
      where: { id },
      relations: ['stock'],
    });
    if (!ingredient) {
      throw new NotFoundException('Malzeme bulunamadı');
    }
    return ingredient;
  }

  // Stocks
  async getStocks(restaurantId: string): Promise<any[]> {
    return this.stockRepository
      .createQueryBuilder('stock')
      .leftJoinAndSelect('stock.ingredient', 'ingredient')
      .where('ingredient.restaurant_id = :restaurantId', { restaurantId })
      .getMany();
  }

  async addStockMovement(dto: CreateStockMovementDto): Promise<StockMovement> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const ingredient = await this.findOneIngredient(dto.ingredient_id);
      const movement = this.movementRepository.create(dto);
      const savedMovement = await queryRunner.manager.save(movement);

      const stock = await queryRunner.manager.findOne(Stock, {
        where: { ingredient_id: dto.ingredient_id },
      });

      if (!stock) {
        throw new NotFoundException('Stok kaydı bulunamadı');
      }

      let newQuantity = Number(stock.quantity);
      if (dto.type === MovementType.IN) {
        newQuantity += dto.quantity;
        
        // Maliyet güncelleme - STOK Girişi yapıldığında birim fiyat varsa güncelle
        if (dto.unit_price) {
          const currentStockQty = Number(stock.quantity);
          const newUnitPrice = Number(dto.unit_price);
          
          // ingredient entity'sindeki updateCosts metodunu kullan
          ingredient.updateCosts(dto.quantity, newUnitPrice, currentStockQty);
          
          // Ingredient'i güncelle
          await queryRunner.manager.save(ingredient);
        }
      } else if (dto.type === MovementType.OUT) {
        newQuantity -= dto.quantity;
      } else if (dto.type === MovementType.ADJUST) {
        newQuantity = dto.quantity;
      }

      if (newQuantity < 0) {
        throw new BadRequestException('Stok miktarı negatif olamaz');
      }

      stock.quantity = newQuantity;
      await queryRunner.manager.save(stock);

      await queryRunner.commitTransaction();
      return savedMovement;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  // Recipes
  async createRecipe(dto: CreateRecipeDto): Promise<Recipe> {
    const recipe = this.recipeRepository.create(dto);
    return this.recipeRepository.save(recipe);
  }

  async getProductRecipe(productId: string): Promise<Recipe[]> {
    return this.recipeRepository.find({
      where: { product_id: productId },
      relations: ['ingredient'],
    });
  }

  async updateIngredient(
    id: string,
    dto: Partial<CreateIngredientDto>,
  ): Promise<Ingredient> {
    const ingredient = await this.findOneIngredient(id);
    Object.assign(ingredient, dto);
    return this.ingredientRepository.save(ingredient);
  }

  async deleteIngredient(id: string): Promise<void> {
    const ingredient = await this.findOneIngredient(id);

    // Business Rule Check: Kullanılan Malzeme Silme Kısıtı
    await this.rulesService.checkRule(
      ingredient.restaurant_id,
      RuleKey.INVENTORY_PREVENT_DELETE,
      id,
      'Bu malzeme silemezsiniz: Geçmiş işlem kayıtları (stok hareketi) bulunmaktadır.'
    );

    const stock = await this.stockRepository.findOne({
      where: { ingredient_id: id },
    });

    if (stock && stock.quantity > 0) {
      throw new BadRequestException('Mevcut stoğu olan malzemeler silinemez.');
    }

    await this.ingredientRepository.softRemove(ingredient);
  }

  async deleteRecipe(id: string): Promise<void> {
    await this.recipeRepository.delete(id);
  }

  async findAllMovements(req, filters: Partial<GetStockMovementsDto>) {
    const restaurantId = req.user.restaurantId;

    const query = this.movementRepository
      .createQueryBuilder('movement')
      .leftJoinAndSelect('movement.ingredient', 'ingredient')
      .where('ingredient.restaurant_id = :restaurantId', { restaurantId });

    this.applyMovementFilters(query, filters);

    query.orderBy('movement.created_at', 'DESC');

    return paginate<StockMovement>(query, {
      page: filters.page ?? 1,
      limit: filters.limit ?? 10,
    });
  }

  async findAllMovementsForExport(
    req: any,
    queryDto: GetStockMovementsDto,
  ): Promise<StockMovement[]> {
    const restaurantId = req.user.restaurantId;
    if (!restaurantId) {
      throw new BadRequestException('Restaurant ID is required');
    }
    const query = this.movementRepository
      .createQueryBuilder('movement')
      .leftJoinAndSelect('movement.ingredient', 'ingredient')
      .where('ingredient.restaurant_id = :restaurantId', { restaurantId });

    this.applyMovementFilters(query, queryDto); // Apply filters using the new helper method

    return query.orderBy('movement.created_at', 'DESC').getMany();
  }

  private applyMovementFilters(
    query: SelectQueryBuilder<StockMovement>,
    queryDto: GetStockMovementsDto,
  ): void {
    const { ingredientName, startDate, endDate, type } = queryDto; // Destructure type

    if (startDate && endDate) {
      const diffInMs = endDate.getTime() - startDate.getTime();
      const diffInDays = diffInMs / (1000 * 60 * 60 * 24);
      if (diffInDays > 31) {
        throw new BadRequestException('Tarih aralığı 31 günden fazla olamaz');
      }
    }

    if (ingredientName) {
      query.andWhere('ingredient.name ILIKE :ingredientName', {
        ingredientName: `%${ingredientName}%`,
      });
    }

    if (startDate) {
      query.andWhere('movement.created_at >= :startDate', { startDate });
    }

    if (endDate) {
      const endOfDay = new Date(endDate);
      endOfDay.setHours(23, 59, 59, 999);
      query.andWhere('movement.created_at <= :endDate', { endDate: endOfDay });
    }

    if (type) {
      // Apply type filter
      query.andWhere('movement.type = :type', { type });
    }
  }

  async decreaseStockForOrder(
    order: Order,
    queryRunner: QueryRunner,
  ): Promise<void> {
    const movementsToSave: StockMovement[] = [];

    for (const item of order.items) {
      if (item.menuItem && item.menuItem.track_inventory) {
        const recipes = await queryRunner.manager.find(Recipe, {
          where: { product_id: item.menuItemId },
          relations: ['ingredient'],
        });

        for (const recipe of recipes) {
          const stockToUpdate = await queryRunner.manager.findOne(Stock, {
            where: { ingredient_id: recipe.ingredient_id },
            lock: { mode: 'pessimistic_write' },
          });

          if (stockToUpdate) {
            const quantityToDecrease = Number(recipe.quantity) * item.quantity;
            const newQuantity =
              Number(stockToUpdate.quantity) - quantityToDecrease;

            if (newQuantity < 0) {
              // Not: Production'da bu uyarıyı daha gelişmiş bir loglama sistemine (örn. Sentry, Datadog) göndermek daha iyi olabilir.
              console.warn(
                `Uyarı: Stokta yeterli ürün yok! Malzeme: ${recipe.ingredient?.name}. İstenen: ${quantityToDecrease}, Mevcut: ${stockToUpdate.quantity}. Stok negatife düşecek.`,
              );
            }

            stockToUpdate.quantity = newQuantity;
            await queryRunner.manager.save(stockToUpdate);

            const movement = queryRunner.manager.create(StockMovement, {
              ingredient_id: recipe.ingredient_id,
              quantity: quantityToDecrease,
              type: MovementType.OUT,
              reason: `Sipariş #${order.orderNumber} satışı`,
              reference_id: order.id,
            });
            movementsToSave.push(movement);
          }
        }
      }
    }

    if (movementsToSave.length > 0) {
      await queryRunner.manager.save(StockMovement, movementsToSave);
    }
  }

  // Toplu stok güncelleme (Hızlı Sayım Modu)
  async bulkUpdateStock(updates: { ingredientId: string; newQuantity: number }[]): Promise<{ success: boolean }> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      for (const update of updates) {
        // Mevcut stok değerini al
        const stock = await queryRunner.manager.findOne(Stock, {
          where: { ingredient_id: update.ingredientId },
        });

        if (!stock) {
          // Stok kaydı yoksa oluştur
          await queryRunner.manager.save(Stock, {
            ingredient_id: update.ingredientId,
            quantity: update.newQuantity,
          });
        } else {
          const oldQuantity = Number(stock.quantity);
          const newQuantity = update.newQuantity;
          const difference = newQuantity - oldQuantity;

          // Stoku güncelle
          stock.quantity = newQuantity;
          await queryRunner.manager.save(stock);

          // Fark kadar bir ADJUST hareketi oluştur
          if (difference !== 0) {
            await queryRunner.manager.save(StockMovement, {
              ingredient_id: update.ingredientId,
              quantity: Math.abs(difference),
              type: difference > 0 ? MovementType.IN : MovementType.OUT,
              reason: 'SAYIM FARKI - Hızlı Sayım',
            });
          }
        }
      }

      await queryRunner.commitTransaction();
      return { success: true };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  // ============================================
  // MALİYET ANALİZ METODLARI
  // ============================================

  /**
   * Malzemenin hangi ürünlerde kullanıldığını getirir
   */
  async getIngredientUsage(ingredientId: string, restaurantId: string) {
    // Malzemeyi bul
    const ingredient = await this.ingredientRepository.findOne({
      where: { id: ingredientId, restaurant_id: restaurantId },
    });

    if (!ingredient) {
      throw new NotFoundException('Malzeme bulunamadı');
    }

    // Bu malzemeyi kullanan reçeteleri bul
    const recipes = await this.recipeRepository
      .createQueryBuilder('recipe')
      .leftJoinAndSelect('recipe.product', 'product')
      .where('recipe.ingredient_id = :ingredientId', { ingredientId })
      .getMany();

    // Her ürün için detayları topla
    const products = recipes.map(recipe => ({
      product_id: recipe.product.id,
      product_name: recipe.product.name,
      quantity: Number(recipe.quantity),
      product_price: Number(recipe.product.price),
    }));

    return {
      ingredient: {
        id: ingredient.id,
        name: ingredient.name,
        unit: ingredient.unit,
      },
      products,
      total_products_affected: products.length,
    };
  }

  /**
   * Maliyet etkisini hesaplar - fiyatı artan malzemelerin aylık toplam zararını
   */
  async calculateCostImpact(restaurantId: string, days: number = 7) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Son N günde fiyatı değişen malzemeleri bul
    const ingredients = await this.ingredientRepository
      .createQueryBuilder('ingredient')
      .leftJoinAndSelect('ingredient.stock', 'stock')
      .where('ingredient.restaurant_id = :restaurantId', { restaurantId })
      .andWhere('ingredient.price_updated_at >= :startDate', { startDate })
      .andWhere('ingredient.previous_price IS NOT NULL')
      .andWhere('ingredient.previous_price != ingredient.last_price')
      .getMany();

    // Her malzeme için aylık tüketimi ve maliyet etkisini hesapla
    const costImpacts = await Promise.all(
      ingredients.map(async (ingredient) => {
        const previousPrice = Number(ingredient.previous_price) || 0;
        const currentPrice = Number(ingredient.last_price) || 0;
        const priceChange = currentPrice - previousPrice;

        // Son 30 gündeki toplam çıkış miktarını hesapla (aylık tüketim)
        const monthlyConsumption = await this.movementRepository
          .createQueryBuilder('movement')
          .select('SUM(movement.quantity)', 'total')
          .where('movement.ingredient_id = :ingredientId', { ingredientId: ingredient.id })
          .andWhere('movement.type = :type', { type: MovementType.OUT })
          .andWhere('movement.created_at >= :startDate', {
            startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          })
          .getRawOne();

        const monthlyQty = Number(monthlyConsumption?.total) || 0;
        const costImpact = priceChange * monthlyQty;

        return {
          ingredient_id: ingredient.id,
          ingredient_name: ingredient.name,
          unit: ingredient.unit,
          previous_price: previousPrice,
          current_price: currentPrice,
          price_change: priceChange,
          price_change_percent: previousPrice > 0 ? (priceChange / previousPrice) * 100 : 0,
          monthly_consumption: monthlyQty,
          cost_impact: costImpact,
        };
      }),
    );

    // Maliyet etkisine göre sırala (en çok zarar edenler üstte)
    return costImpacts.sort((a, b) => b.cost_impact - a.cost_impact);
  }

  /**
   * Sayım farklarını getirir
   */
  async getCountDifferences(restaurantId: string, weeks: number = 4) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - weeks * 7);

    // Sayım farkı hareketlerini bul
    const movements = await this.movementRepository
      .createQueryBuilder('movement')
      .leftJoinAndSelect('movement.ingredient', 'ingredient')
      .where('ingredient.restaurant_id = :restaurantId', { restaurantId })
      .andWhere('movement.reason LIKE :reason', { reason: '%SAYIM FARKI%' })
      .andWhere('movement.created_at >= :startDate', { startDate })
      .orderBy('movement.created_at', 'DESC')
      .getMany();

    return movements.map(movement => {
      const systemQty = Number(movement.quantity);
      // Sayılan miktar tersi - IN ise artış, OUT ise azalış
      const countedQty = movement.type === MovementType.IN
        ? systemQty
        : -systemQty;
      const difference = movement.type === MovementType.IN ? systemQty : -systemQty;
      const avgCost = Number(movement.ingredient?.average_cost) || 0;

      return {
        date: movement.created_at.toISOString(),
        ingredient_name: movement.ingredient?.name || 'Bilinmiyor',
        system_quantity: 0, // Sistemde olması gereken - bu hesaplanamaz tek hareketten
        counted_quantity: countedQty,
        difference: difference,
        difference_try: difference * avgCost,
      };
    });
  }

  /**
   * Food Cost %35 aşan ürünleri getirir
   */
  async getFoodCostAlerts(restaurantId: string) {
    // MenuItem'lar restaurant'a doğrudan değil, Category üzerinden bağlı
    // Bu yüzden category üzerinden join etmeliyiz
    const menuItems = await this.menuItemRepository
      .createQueryBuilder('menuItem')
      .innerJoin('menuItem.category', 'category')
      .where('category.restaurant_id = :restaurantId', { restaurantId })
      .andWhere('menuItem.is_available = :isAvailable', { isAvailable: true })
      .getMany();

    const alerts: Array<{
      product_id: string;
      product_name: string;
      current_price: number;
      recipe_cost: number;
      food_cost_percent: number;
      suggested_price: number;
    }> = [];
    const FOOD_COST_THRESHOLD = 35;

    for (const menuItem of menuItems) {
      // Her ürünün reçetesini al
      const recipes = await this.recipeRepository
        .createQueryBuilder('recipe')
        .leftJoinAndSelect('recipe.ingredient', 'ingredient')
        .where('"recipe"."product_id" = :productId', { productId: menuItem.id })
        .getMany();

      if (!recipes || recipes.length === 0) continue;

      // Reçete maliyetini hesapla
      let recipeCost = 0;
      for (const recipe of recipes) {
        if (recipe.ingredient) {
          const ingredientCost = Number(recipe.ingredient.average_cost) || 0;
          recipeCost += ingredientCost * Number(recipe.quantity);
        }
      }

      const productPrice = Number(menuItem.price);
      const foodCostPercent = productPrice > 0 ? (recipeCost / productPrice) * 100 : 0;

      // Eğer food cost %35'i aşıyorsa uyarı ekle
      if (foodCostPercent > FOOD_COST_THRESHOLD) {
        const suggestedPrice = recipeCost / (FOOD_COST_THRESHOLD / 100);
        alerts.push({
          product_id: menuItem.id,
          product_name: menuItem.name,
          current_price: productPrice,
          recipe_cost: recipeCost,
          food_cost_percent: Math.round(foodCostPercent * 100) / 100,
          suggested_price: Math.round(suggestedPrice * 100) / 100,
        });
      }
    }

    // Food cost'a göre sırala
    return alerts.sort((a, b) => b.food_cost_percent - a.food_cost_percent);
  }
}
