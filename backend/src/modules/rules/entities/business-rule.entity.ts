import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

import { RuleKey } from '../enums/rule-key.enum';

export enum RuleCategory {
    CASH = 'CASH',
    ORDER = 'ORDER',
    INVENTORY = 'INVENTORY',
    MENU = 'MENU',
    SYSTEM = 'SYSTEM',
}

@Entity('business_rules', { schema: 'business' })
@Index(['restaurant_id', 'key'], { unique: true })
export class BusinessRule extends BaseEntity {
    @Column()
    restaurant_id: string;

    @Column({ type: 'enum', enum: RuleCategory })
    category: RuleCategory;

    @Column({ type: 'enum', enum: RuleKey })
    key: RuleKey;

    @Column()
    name: string;

    @Column({ type: 'text', nullable: true })
    description: string;

    @Column({ default: true })
    is_enabled: boolean;

    @Column({ type: 'jsonb', nullable: true })
    config: Record<string, any>;
}
