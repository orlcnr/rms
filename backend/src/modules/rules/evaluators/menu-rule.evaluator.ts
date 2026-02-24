import { Injectable, Logger } from '@nestjs/common';
import { RuleEvaluator } from '../interfaces/rule-evaluator.interface';
import { BusinessRule } from '../entities/business-rule.entity';
import { RuleKey } from '../enums/rule-key.enum';
import { InjectRepository } from '@nestjs/typeorm';
import { OrderItem } from '../../orders/entities/order-item.entity';
import { OrderStatus } from '../../orders/enums/order-status.enum';
import { Repository } from 'typeorm';

@Injectable()
export class MenuRuleEvaluator implements RuleEvaluator {
    private readonly logger = new Logger(MenuRuleEvaluator.name);

    constructor(
        @InjectRepository(OrderItem)
        private readonly orderItemRepository: Repository<OrderItem>,
    ) { }

    async handle(restaurantId: string, rule: BusinessRule, context?: any): Promise<boolean> {
        switch (rule.key) {
            case RuleKey.MENU_PREVENT_DELETE_ITEM:
                return this.checkPreventDelete(context);
            default:
                this.logger.warn(`Unknown menu rule key: ${rule.key}`);
                return true;
        }
    }

    /**
     * Check if menu item can be deleted.
     * Returns true (can delete) if:
     * - Product has no active orders (not cancelled, not completed)
     * 
     * Returns false (cannot delete) if:
     * - Product has orders that are still active (pending, preparing, ready, served, paid, on_way, delivered)
     */
    private async checkPreventDelete(menuItemId: string): Promise<boolean> {
        if (!menuItemId) return true;

        // Check if there are any active order items for this menu item
        // Active means not cancelled
        const activeStatuses = [
            OrderStatus.PENDING,
            OrderStatus.PREPARING,
            OrderStatus.READY,
            OrderStatus.SERVED,
            OrderStatus.PAID,
            OrderStatus.ON_WAY,
            OrderStatus.DELIVERED,
        ];

        const activeOrderCount = await this.orderItemRepository
            .createQueryBuilder('item')
            .leftJoinAndSelect('item.order', 'order')
            .where('item.menu_item_id = :menuItemId', { menuItemId })
            .andWhere('item.status IN (:...statuses)', { statuses: activeStatuses })
            .getCount();

        // If there are active orders, prevent deletion
        if (activeOrderCount > 0) {
            return false;
        }

        return true;
    }
}
