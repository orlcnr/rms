import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BusinessRule } from './entities/business-rule.entity';
import { RulesService } from './rules.service';
import { RulesController } from './rules.controller';
import { CashRuleEvaluator } from './evaluators/cash-rule.evaluator';
import { OrderRuleEvaluator } from './evaluators/order-rule.evaluator';
import { InventoryRuleEvaluator } from './evaluators/inventory-rule.evaluator';
import { MenuRuleEvaluator } from './evaluators/menu-rule.evaluator';
import { TablesModule } from '../tables/tables.module';
import { StockMovement } from '../inventory/entities/stock-movement.entity';
import { OrderItem } from '../orders/entities/order-item.entity';

@Global()
@Module({
    imports: [
        TypeOrmModule.forFeature([BusinessRule, StockMovement, OrderItem]),
        TablesModule, // Required by CashRuleEvaluator
    ],
    controllers: [RulesController],
    providers: [
        RulesService,
        CashRuleEvaluator,
        OrderRuleEvaluator,
        InventoryRuleEvaluator,
        MenuRuleEvaluator,
    ],
    exports: [RulesService],
})
export class RulesModule { }
