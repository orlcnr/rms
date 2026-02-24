import { Injectable, Logger, BadRequestException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BusinessRule, RuleCategory } from './entities/business-rule.entity';
import { RuleEvaluator } from './interfaces/rule-evaluator.interface';
import { CashRuleEvaluator } from './evaluators/cash-rule.evaluator';
import { OrderRuleEvaluator } from './evaluators/order-rule.evaluator';
import { InventoryRuleEvaluator } from './evaluators/inventory-rule.evaluator';
import { MenuRuleEvaluator } from './evaluators/menu-rule.evaluator';
import { RuleKey } from './enums/rule-key.enum';

@Injectable()
export class RulesService implements OnModuleInit {
    private readonly logger = new Logger(RulesService.name);
    private readonly evaluators = new Map<RuleCategory, RuleEvaluator>();

    constructor(
        @InjectRepository(BusinessRule)
        private readonly ruleRepository: Repository<BusinessRule>,
        private readonly cashRuleEvaluator: CashRuleEvaluator,
        private readonly orderRuleEvaluator: OrderRuleEvaluator,
        private readonly inventoryRuleEvaluator: InventoryRuleEvaluator,
        private readonly menuRuleEvaluator: MenuRuleEvaluator,
    ) { }

    onModuleInit() {
        this.evaluators.set(RuleCategory.CASH, this.cashRuleEvaluator);
        this.evaluators.set(RuleCategory.ORDER, this.orderRuleEvaluator);
        this.evaluators.set(RuleCategory.INVENTORY, this.inventoryRuleEvaluator);
        this.evaluators.set(RuleCategory.MENU, this.menuRuleEvaluator);
        this.logger.log('Business Rule Evaluators registered.');
    }

    /**
     * Gets a rule for a specific restaurant.
     */
    async getRule(restaurantId: string, key: RuleKey): Promise<BusinessRule | null> {
        return this.ruleRepository.findOne({
            where: { restaurant_id: restaurantId, key },
        });
    }

    /**
     * Evaluates a rule using the Strategy Pattern.
     * @param restaurantId The restaurant ID
     * @param key The rule key
     * @param context Optional additional data for evaluation
     * @param errorMessage Custom error message
     */
    async checkRule(
        restaurantId: string,
        key: RuleKey,
        context?: any,
        errorMessage?: string
    ): Promise<void> {
        const rule = await this.getRule(restaurantId, key);

        // If rule doesn't exist or is disabled, skip validation
        if (!rule || !rule.is_enabled) {
            return;
        }

        const evaluator = this.evaluators.get(rule.category);
        if (!evaluator) {
            this.logger.warn(`No evaluator found for category: ${rule.category} (Rule: ${key})`);
            return;
        }

        const isValid = await evaluator.handle(restaurantId, rule, context);

        if (!isValid) {
            this.logger.warn(`Business Rule Violated: [${key}] for Restaurant [${restaurantId}]. Context: ${JSON.stringify(context)}`);
            throw new BadRequestException(errorMessage || rule.name || 'Bu işlem kural kısıtlaması nedeniyle gerçekleştirilemez.');
        }

        this.logger.log(`Business Rule Passed: [${key}] for Restaurant [${restaurantId}]`);
    }

    /**
     * Lists all rules for a restaurant.
     */
    async listRules(restaurantId: string): Promise<BusinessRule[]> {
        return this.ruleRepository.find({
            where: { restaurant_id: restaurantId },
            order: { category: 'ASC', name: 'ASC' },
        });
    }

    /**
     * Toggles a rule status.
     */
    async toggleRule(restaurantId: string, key: RuleKey, isEnabled: boolean): Promise<BusinessRule> {
        let rule = await this.getRule(restaurantId, key);

        if (!rule) {
            this.logger.error(`Attempted to toggle non-existent rule: [${key}] for Restaurant [${restaurantId}]`);
            throw new BadRequestException('Kural bulunamadı.');
        }

        rule.is_enabled = isEnabled;
        const updatedRule = await this.ruleRepository.save(rule);

        this.logger.log(`Business Rule [${key}] toggled to [${isEnabled}] for Restaurant [${restaurantId}]`);
        return updatedRule;
    }

    /**
     * Initializes default rules for a new restaurant.
     */
    async initializeDefaultRules(restaurantId: string): Promise<void> {
        const defaultRules = [
            {
                category: RuleCategory.CASH,
                key: RuleKey.CASH_CHECK_OPEN_TABLES,
                name: 'Kapatırken Açık Masa Kontrolü',
                description: 'Kasayı kapatırken açık masa varsa uyarır/engeller.',
                is_enabled: true,
            },
            {
                category: RuleCategory.ORDER,
                key: RuleKey.ORDER_MANDATORY_TABLE,
                name: 'Masa Seçimi Zorunluluğu',
                description: 'Paket servis dışındaki siparişlerde masa seçilmelidir.',
                is_enabled: false,
            },
            {
                category: RuleCategory.ORDER,
                key: RuleKey.ORDER_PREVENT_VOID,
                name: 'Onaylı Sipariş İptal Kısıtı',
                description: 'Hazırlık aşamasına geçmiş siparişlerin iptal edilmesini kısıtlar.',
                is_enabled: true,
            },
            {
                category: RuleCategory.INVENTORY,
                key: RuleKey.INVENTORY_PREVENT_DELETE,
                name: 'Kullanılan Malzeme Silme Kısıtı',
                description: 'İşlem görmüş (stok hareketi olan) malzemelerin silinmesini engeller.',
                is_enabled: true,
            },
            {
                category: RuleCategory.MENU,
                key: RuleKey.MENU_PREVENT_DELETE_ITEM,
                name: 'Sipariş Edilmiş Ürün Silme Kısıtı',
                description: 'Siparişlerde kullanılmış ürünlerin silinmesini engeller.',
                is_enabled: true,
            }
        ];

        for (const r of defaultRules) {
            const existing = await this.getRule(restaurantId, r.key);
            if (!existing) {
                await this.ruleRepository.save(
                    this.ruleRepository.create({
                        ...r,
                        restaurant_id: restaurantId,
                    })
                );
            }
        }

        this.logger.log(`Default Business Rules initialized for Restaurant [${restaurantId}]`);
    }
}
