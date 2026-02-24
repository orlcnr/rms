import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';
import { CashMovementType } from '../enums/cash.enum';
import { PaymentMethod } from '../../payments/entities/payment.entity';

@Entity('cash_movements', { schema: 'operations' })
export class CashMovement extends BaseEntity {
    @Column({ name: 'cash_session_id' })
    cashSessionId: string;

    @ManyToOne('CashSession', 'movements')
    @JoinColumn({ name: 'cash_session_id' })
    session: any;

    @Column({
        type: 'enum',
        enum: CashMovementType,
    })
    type: CashMovementType;

    @Column({
        name: 'payment_method',
        type: 'enum',
        enum: PaymentMethod,
    })
    paymentMethod: PaymentMethod;

    @Column({
        type: 'decimal',
        precision: 10,
        scale: 2,
    })
    amount: number;

    @Column({ type: 'text', nullable: true })
    description: string;

    @Column({ name: 'user_id', nullable: true })
    userId: string;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'user_id' })
    user: User;

    @Column({ name: 'order_id', type: 'uuid', nullable: true })
    orderId: string;
}
