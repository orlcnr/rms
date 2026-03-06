import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InventoryService } from './inventory.service';
import { InventoryController } from './inventory.controller';
import { Ingredient } from './entities/ingredient.entity';
import { Stock } from './entities/stock.entity';
import { Recipe } from './entities/recipe.entity';
import { StockMovement } from './entities/stock-movement.entity';
import { MenuItem } from '../menus/entities/menu-item.entity';
import { Restaurant } from '../restaurants/entities/restaurant.entity';
import { CreateStockMovementUseCase } from './use-cases/create-stock-movement.use-case';
import { BulkUpdateStockUseCase } from './use-cases/bulk-update-stock.use-case';
import { TransactionalHelper } from '../../common/databases/transactional.helper';
import { BranchStock } from './entities/branch-stock.entity';
import { BranchIngredientCost } from './entities/branch-ingredient-cost.entity';
import { DeductBranchStockUseCase } from './use-cases/deduct-branch-stock.use-case';
import { InitBranchStockUseCase } from './use-cases/init-branch-stock.use-case';
import { InitBranchCostUseCase } from './use-cases/init-branch-cost.use-case';
import { InventoryEventFactory } from './events/inventory-event.factory';
import { InventoryEventPublisher } from './publishers/inventory-event.publisher';
import { OutboxEvent } from '../../common/outbox/outbox.entity';
import { OutboxService } from '../../common/outbox/outbox.service';
import { OutboxPublisherWorker } from '../../common/outbox/outbox.publisher.worker';
import { InventoryAuditConsumer } from './consumers/inventory-audit.consumer';
import { InventoryAlertConsumer } from './consumers/inventory-alert.consumer';
import { InventoryMetricsConsumer } from './consumers/inventory-metrics.consumer';
import { BranchCostService } from './services/branch-cost.service';
import { InventoryAuthorizationService } from './services/inventory-authorization.service';
import { InventoryQueryService } from './services/inventory-query.service';
import { InventoryCommandService } from './services/inventory-command.service';
import { InventoryAnalysisService } from './services/inventory-analysis.service';
import { IngredientRepository } from './repositories/ingredient.repository';
import { BranchStockRepository } from './repositories/branch-stock.repository';
import { StockMovementRepository } from './repositories/stock-movement.repository';
import { FoodCostSnapshotRepository } from './repositories/food-cost-snapshot.repository';
import { IngredientQueryFactory } from './query/factories/ingredient-query.factory';
import { MovementQueryFactory } from './query/factories/movement-query.factory';
import { FoodCostSnapshot } from './entities/food-cost-snapshot.entity';
import { InventoryFoodCostSnapshotCronService } from './services/inventory-food-cost-snapshot-cron.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Ingredient,
      Stock,
      BranchStock,
      BranchIngredientCost,
      Recipe,
      StockMovement,
      MenuItem,
      Restaurant,
      FoodCostSnapshot,
      OutboxEvent,
    ]),
  ],
  controllers: [
    InventoryController,
    InventoryAuditConsumer,
    InventoryAlertConsumer,
    InventoryMetricsConsumer,
  ],
  providers: [
    InventoryService,
    InventoryQueryService,
    InventoryCommandService,
    InventoryAnalysisService,
    CreateStockMovementUseCase,
    BulkUpdateStockUseCase,
    DeductBranchStockUseCase,
    InitBranchStockUseCase,
    InitBranchCostUseCase,
    BranchCostService,
    InventoryAuthorizationService,
    IngredientRepository,
    BranchStockRepository,
    StockMovementRepository,
    FoodCostSnapshotRepository,
    IngredientQueryFactory,
    MovementQueryFactory,
    InventoryFoodCostSnapshotCronService,
    InventoryEventFactory,
    InventoryEventPublisher,
    OutboxService,
    OutboxPublisherWorker,
    TransactionalHelper,
  ],
  exports: [
    InventoryService,
    InventoryQueryService,
    InventoryCommandService,
    InventoryAnalysisService,
    CreateStockMovementUseCase,
    BulkUpdateStockUseCase,
    DeductBranchStockUseCase,
    InitBranchStockUseCase,
    InitBranchCostUseCase,
    BranchCostService,
    InventoryAuthorizationService,
  ],
})
export class InventoryModule {}
