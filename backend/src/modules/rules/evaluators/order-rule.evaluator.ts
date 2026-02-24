import { Injectable, Logger } from '@nestjs/common';
import { RuleEvaluator } from '../interfaces/rule-evaluator.interface';
import { BusinessRule } from '../entities/business-rule.entity';
import { OrderStatus } from '../../orders/enums/order-status.enum';
import { RuleKey } from '../enums/rule-key.enum';

@Injectable()
export class OrderRuleEvaluator implements RuleEvaluator {
    private readonly logger = new Logger(OrderRuleEvaluator.name);

    async handle(restaurantId: string, rule: BusinessRule, context?: any): Promise<boolean> {
        switch (rule.key) {
            case RuleKey.ORDER_MANDATORY_TABLE:
                return this.checkMandatoryTable(context);
            case RuleKey.ORDER_PREVENT_VOID:
                return this.checkPreventVoid(context);
            default:
                this.logger.warn(`Unknown order rule key: ${rule.key}`);
                return true;
        }
    }

    private checkMandatoryTable(context: any): boolean {
        // Context should be the tableId string
        return !!context;
    }

    private checkPreventVoid(context: any): boolean {
        // Context should be the Order object
        if (!context || !context.status) return true;

        // Rule: Only allow cancellation if order is in PENDING status
        return context.status === OrderStatus.PENDING;
    }
}
