import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MenusService } from './menus.service';
import { MenusController } from './menus.controller';
import { Category } from './entities/category.entity';
import { MenuItem } from './entities/menu-item.entity';
import { Recipe } from '../inventory/entities/recipe.entity';
import { Ingredient } from '../inventory/entities/ingredient.entity';
import { Stock } from '../inventory/entities/stock.entity';
import { Restaurant } from '../restaurants/entities/restaurant.entity';
import { PopularityConsumer } from './popularity.consumer';
import { RulesModule } from '../rules/rules.module';
import { CategoryRepository } from './repositories/category.repository';
import { MenuItemRepository } from './repositories/menu-item.repository';
import { RecipeRepository } from './repositories/recipe.repository';
import { CategoriesService } from './services/categories.service';
import { MenuItemsService } from './services/menu-items.service';
import { MenuItemAvailabilityService } from './services/menu-item-availability.service';
import { MenuItemQueryService } from './services/menu-item-query.service';
import { MenuItemSpecFactory } from './query/menu-item-spec.factory';
import { BranchMenuOverride } from './entities/branch-menu-override.entity';
import { EffectiveMenuCacheService } from './services/effective-menu-cache.service';
import { BranchMenuOverridesService } from './services/branch-menu-overrides.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Category,
      MenuItem,
      Recipe,
      Ingredient,
      Stock,
      Restaurant,
      BranchMenuOverride,
    ]),
    RulesModule,
  ],
  controllers: [MenusController, PopularityConsumer],
  providers: [
    MenusService,
    CategoryRepository,
    MenuItemRepository,
    RecipeRepository,
    CategoriesService,
    MenuItemsService,
    MenuItemAvailabilityService,
    MenuItemQueryService,
    MenuItemSpecFactory,
    EffectiveMenuCacheService,
    BranchMenuOverridesService,
  ],
  exports: [MenusService],
})
export class MenusModule {}
