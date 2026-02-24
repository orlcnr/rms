import { Injectable, Logger } from '@nestjs/common';
import { RuleEvaluator } from '../interfaces/rule-evaluator.interface';
import { BusinessRule } from '../entities/business-rule.entity';
import { RuleKey } from '../enums/rule-key.enum';
import { InjectRepository } from '@nestjs/typeorm';
import { StockMovement } from '../../inventory/entities/stock-movement.entity';
import { Repository } from 'typeorm';

@Injectable()
export class InventoryRuleEvaluator implements RuleEvaluator {
    private readonly logger = new Logger(InventoryRuleEvaluator.name);

    constructor(
        @InjectRepository(StockMovement)
        private readonly movementRepository: Repository<StockMovement>,
    ) { }

    async handle(restaurantId: string, rule: BusinessRule, context?: any): Promise<boolean> {
        switch (rule.key) {
            case RuleKey.INVENTORY_PREVENT_DELETE:
                return this.checkPreventDelete(context);
            default:
                this.logger.warn(`Unknown inventory rule key: ${rule.key}`);
                return true;
        }
    }

    private async checkPreventDelete(ingredientId: string): Promise<boolean> {
        if (!ingredientId) return true;

        const movementCount = await this.movementRepository.count({
            where: { ingredient_id: ingredientId }
        });

        // Rule passes (isValid=true) if there are NO movements.
        // If movementCount > 0, it returns false (violation).
        return movementCount === 0;
    }
}
