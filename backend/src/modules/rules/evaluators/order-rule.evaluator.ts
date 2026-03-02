import { Injectable, Logger, forwardRef, Inject } from '@nestjs/common';
import { RuleEvaluator } from '../interfaces/rule-evaluator.interface';
import { BusinessRule } from '../entities/business-rule.entity';
import { OrderStatus } from '../../orders/enums/order-status.enum';
import { RuleKey } from '../enums/rule-key.enum';
import { CashService } from '../../cash/cash.service';

@Injectable()
export class OrderRuleEvaluator implements RuleEvaluator {
  private readonly logger = new Logger(OrderRuleEvaluator.name);

  constructor(
    @Inject(forwardRef(() => CashService))
    private readonly cashService: CashService,
  ) {}

  async handle(
    restaurantId: string,
    rule: BusinessRule,
    context?: any,
  ): Promise<boolean> {
    switch (rule.key) {
      case RuleKey.ORDER_MANDATORY_TABLE:
        return this.checkMandatoryTable(context);
      case RuleKey.ORDER_PREVENT_VOID:
        return this.checkPreventVoid(context);
      case RuleKey.ORDER_REQUIRE_OPEN_CASH:
        return this.checkOpenCash(restaurantId);
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

  private async checkOpenCash(restaurantId: string): Promise<boolean> {
    const activeSessions =
      await this.cashService.getAllActiveSessions(restaurantId);
    return activeSessions.length > 0;
  }
}
