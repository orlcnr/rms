import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InventoryService } from './inventory.service';
import { InventoryController } from './inventory.controller';
import { Ingredient } from './entities/ingredient.entity';
import { Stock } from './entities/stock.entity';
import { Recipe } from './entities/recipe.entity';
import { StockMovement } from './entities/stock-movement.entity';
import { MenuItem } from '../menus/entities/menu-item.entity';
import { CreateStockMovementUseCase } from './use-cases/create-stock-movement.use-case';
import { TransactionalHelper } from '../../common/databases/transactional.helper';

@Module({
  imports: [
    TypeOrmModule.forFeature([Ingredient, Stock, Recipe, StockMovement, MenuItem]),
  ],
  controllers: [InventoryController],
  providers: [InventoryService, CreateStockMovementUseCase, TransactionalHelper],
  exports: [InventoryService, CreateStockMovementUseCase],
})
export class InventoryModule {}
