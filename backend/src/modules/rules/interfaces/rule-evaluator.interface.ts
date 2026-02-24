import { BusinessRule } from '../entities/business-rule.entity';

export interface RuleEvaluator {
    /**
     * Executes the business rule logic.
     * @param restaurantId The restaurant ID
     * @param rule The rule entity from the database
     * @param context Optional additional data needed for evaluation (e.g., order object, table status)
     * @returns Promise<boolean> - true if rule passes (CONSTRAINTS MET), false if violated.
     */
    handle(restaurantId: string, rule: BusinessRule, context?: any): Promise<boolean>;
}
