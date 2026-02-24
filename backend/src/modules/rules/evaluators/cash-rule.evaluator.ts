import { Injectable, Logger } from '@nestjs/common';
import { RuleEvaluator } from '../interfaces/rule-evaluator.interface';
import { BusinessRule } from '../entities/business-rule.entity';
import { TablesService } from '../../tables/tables.service';
import { RuleKey } from '../enums/rule-key.enum';

@Injectable()
export class CashRuleEvaluator implements RuleEvaluator {
    private readonly logger = new Logger(CashRuleEvaluator.name);

    constructor(private readonly tablesService: TablesService) { }

    async handle(restaurantId: string, rule: BusinessRule, context?: any): Promise<boolean> {
        switch (rule.key) {
            case RuleKey.CASH_CHECK_OPEN_TABLES:
                return this.checkOpenTables(restaurantId);
            default:
                this.logger.warn(`Unknown cash rule key: ${rule.key}`);
                return true; // Unknown rules pass by default but log a warning
        }
    }

    private async checkOpenTables(restaurantId: string): Promise<boolean> {
        const hasOpen = await this.tablesService.hasOpenTables(restaurantId);
        return !hasOpen; // Valid if NO open tables
    }
}
