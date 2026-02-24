import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, IsNull } from 'typeorm';
import { OnEvent } from '@nestjs/event-emitter';
import { CashRegister } from './entities/cash-register.entity';
import { CashSession } from './entities/cash-session.entity';
import { CashMovement } from './entities/cash-movement.entity';
import { CashSessionStatus, CashMovementType } from './enums/cash.enum';
import { PaymentMethod } from '../payments/entities/payment.entity';
import { OpenCashSessionDto, CloseCashSessionDto, CreateCashMovementDto } from './dto/cash-ops.dto';
import { RulesService } from '../rules/rules.service';
import { TablesService } from '../tables/tables.service';
import { RuleKey } from '../rules/enums/rule-key.enum';

@Injectable()
export class CashService {
    private readonly logger = new Logger(CashService.name);

    constructor(
        @InjectRepository(CashRegister)
        private readonly registerRepository: Repository<CashRegister>,
        @InjectRepository(CashSession)
        private readonly sessionRepository: Repository<CashSession>,
        @InjectRepository(CashMovement)
        private readonly movementRepository: Repository<CashMovement>,
        private readonly dataSource: DataSource,
        private readonly rulesService: RulesService,
        private readonly tablesService: TablesService,
    ) { }

    /**
     * Restoran için varsayılan kasayı döner veya yoksa oluşturur.
     */
    async ensureDefaultRegister(restaurantId: string): Promise<CashRegister> {
        let register = await this.registerRepository.findOneBy({
            restaurantId,
            name: 'Genel Kasa',
        });

        if (!register) {
            register = this.registerRepository.create({
                restaurantId,
                name: 'Genel Kasa',
                active: true,
            });
            register = await this.registerRepository.save(register);
        }

        return register;
    }

    /**
     * Kasa oturumunu açar.
     */
    async openSession(restaurantId: string, userId: string, dto: OpenCashSessionDto): Promise<CashSession> {
        const register = await this.registerRepository.findOneBy({ id: dto.cashRegisterId, restaurantId });
        if (!register) throw new NotFoundException('Kasa bulunamadı');

        const activeSession = await this.sessionRepository.findOneBy({
            cashRegisterId: dto.cashRegisterId,
            status: CashSessionStatus.OPEN,
        });
        if (activeSession) throw new BadRequestException('Bu kasada zaten açık bir oturum var');

        const session = this.sessionRepository.create({
            cashRegisterId: dto.cashRegisterId,
            openedById: userId,
            openingBalance: dto.openingBalance,
            status: CashSessionStatus.OPEN,
        });

        return this.sessionRepository.save(session);
    }

    /**
     * Kasa oturumunu kapatır.
     */
    async closeSession(userId: string, sessionId: string, dto: CloseCashSessionDto): Promise<CashSession> {
        const session = await this.sessionRepository.findOne({
            where: { id: sessionId },
            relations: ['movements'],
        });

        if (!session) throw new NotFoundException('Oturum bulunamadı');
        if (session.status === CashSessionStatus.CLOSED) throw new BadRequestException('Oturum zaten kapalı');

        // Business Rule Check: Kapatırken Açık Masa Kontrolü
        const register = await this.registerRepository.findOneBy({ id: session.cashRegisterId });
        if (register) {
            await this.rulesService.checkRule(
                register.restaurantId,
                RuleKey.CASH_CHECK_OPEN_TABLES,
                null, // No context needed for this rule as it checks all tables
                'Kasa kapatılamaz: Hala açık (hesabı ödenmemiş) masalar bulunmaktadır.'
            );
        }

        // Beklenen bakiyeyi hesapla (Açılış + Nakit Girişler - Nakit Çıkışlar)
        const movements = await this.movementRepository.findBy({ cashSessionId: sessionId });

        // NOT: Sadece CADD/CASH (Nakit) olanlar fiziki kasayı etkiler. 
        // Kart çekimleri 'banka/pos' kalemi olarak raporda görülür.
        const netCashChange = movements.reduce((acc, mov) => {
            if (mov.paymentMethod !== PaymentMethod.CASH) return acc;
            if (mov.type === CashMovementType.OUT) return acc - Number(mov.amount);
            return acc + Number(mov.amount);
        }, 0);

        const expectedBalance = Number(session.openingBalance) + netCashChange;

        session.status = CashSessionStatus.CLOSED;
        session.closedById = userId;
        session.closedAt = new Date();
        session.closingBalance = expectedBalance;
        session.countedBalance = dto.countedBalance;
        session.difference = dto.countedBalance - expectedBalance;

        return this.sessionRepository.save(session);
    }

    /**
     * Manuel kasa hareketi ekler.
     */
    async addMovement(userId: string, sessionId: string, dto: CreateCashMovementDto): Promise<CashMovement> {
        const session = await this.sessionRepository.findOneBy({ id: sessionId, status: CashSessionStatus.OPEN });
        if (!session) throw new BadRequestException('Hareket eklemek için açık bir kasa oturumu olmalı');

        const movement = this.movementRepository.create({
            ...dto,
            cashSessionId: sessionId,
            userId,
        });

        return this.movementRepository.save(movement);
    }

    /**
     * Tüm kasa oturumlarını filtrelerle getirir (raporlama için).
     */
    async getSessionHistory(restaurantId: string, filters: {
        startDate?: string;
        endDate?: string;
        registerId?: string;
        status?: CashSessionStatus;
        openedById?: string;
    }): Promise<CashSession[]> {
        const queryBuilder = this.sessionRepository
            .createQueryBuilder('session')
            .leftJoinAndSelect('session.cashRegister', 'register')
            .leftJoinAndSelect('session.openedBy', 'openedBy')
            .leftJoinAndSelect('session.closedBy', 'closedBy')
            .where('register.restaurant_id = :restaurantId', { restaurantId })
            .orderBy('session.opened_at', 'DESC');

        if (filters.startDate) {
            queryBuilder.andWhere('session.opened_at >= :startDate', {
                startDate: new Date(filters.startDate),
            });
        }

        if (filters.endDate) {
            queryBuilder.andWhere('session.opened_at <= :endDate', {
                endDate: new Date(filters.endDate + 'T23:59:59'),
            });
        }

        if (filters.registerId) {
            queryBuilder.andWhere('session.cash_register_id = :registerId', {
                registerId: filters.registerId,
            });
        }

        if (filters.status) {
            queryBuilder.andWhere('session.status = :status', {
                status: filters.status,
            });
        }

        if (filters.openedById) {
            queryBuilder.andWhere('session.opened_by_id = :openedById', {
                openedById: filters.openedById,
            });
        }

        return queryBuilder.getMany();
    }

    @OnEvent('payment.completed')
    async handlePaymentCompleted(event: {
        restaurantId: string;
        orderId: string;
        amount: number;
        paymentMethod: PaymentMethod;
        userId?: string;
    }) {
        try {
            // Önce siparişi veren kullanıcının açık bir kasa oturumu var mı kontrol et
            if (event.userId) {
                const userOpenSession = await this.sessionRepository
                    .createQueryBuilder('session')
                    .innerJoin('session.cashRegister', 'register')
                    .where('register.restaurant_id = :restaurantId', { restaurantId: event.restaurantId })
                    .andWhere('session.opened_by_id = :userId', { userId: event.userId })
                    .andWhere('session.status = :status', { status: CashSessionStatus.OPEN })
                    .getOne();

                if (userOpenSession) {
                    await this.movementRepository.save({
                        cashSessionId: userOpenSession.id,
                        type: CashMovementType.SALE,
                        paymentMethod: event.paymentMethod,
                        amount: event.amount,
                        orderId: event.orderId,
                        description: `Sipariş Ödemesi (#${event.orderId.substring(0, 8)})`,
                        userId: event.userId || undefined,
                    });
                    this.logger.log(`Sale logged to user's active session: ${userOpenSession.id}`);
                    return;
                }
            }

            // Kullanıcının açık oturumu yoksa, restorandaki herhangi bir açık oturumu bul
            const register = await this.ensureDefaultRegister(event.restaurantId);

            let session = await this.sessionRepository.findOneBy({
                cashRegisterId: register.id,
                status: CashSessionStatus.OPEN,
            });

            if (!session) {
                session = await this.dataSource.getRepository(CashSession)
                    .createQueryBuilder('session')
                    .innerJoin('session.cashRegister', 'register')
                    .where('register.restaurant_id = :restaurantId', { restaurantId: event.restaurantId })
                    .andWhere('session.status = :status', { status: CashSessionStatus.OPEN })
                    .orderBy('session.opened_at', 'ASC')
                    .getOne();
            }

            if (session) {
                await this.movementRepository.save({
                    cashSessionId: session.id,
                    type: CashMovementType.SALE,
                    paymentMethod: event.paymentMethod,
                    amount: event.amount,
                    orderId: event.orderId,
                    description: `Sipariş Ödemesi (#${event.orderId.substring(0, 8)})`,
                    userId: event.userId || undefined,
                });
                this.logger.log(`Sale automatically logged to cash session: ${session.id}`);
            } else {
                this.logger.warn(`No active cash session found for restaurant ${event.restaurantId}. Payment ${event.amount} not logged to cash.`);
            }
        } catch (error) {
            this.logger.error('Failed to log automatic cash movement', error.stack);
        }
    }

    async getRegisters(restaurantId: string): Promise<CashRegister[]> {
        return this.registerRepository.find({ where: { restaurantId } });
    }

    async getSessions(registerId: string): Promise<CashSession[]> {
        return this.sessionRepository.find({
            where: { cashRegisterId: registerId },
            order: { openedAt: 'DESC' } as any,
            relations: ['openedBy', 'closedBy'],
        });
    }

    async getMovements(sessionId: string): Promise<CashMovement[]> {
        return this.movementRepository.find({
            where: { cashSessionId: sessionId },
            order: { created_at: 'ASC' } as any,
            relations: ['user'],
        });
    }

    /**
     * Yeni kasa oluşturur.
     */
    async createRegister(restaurantId: string, name: string): Promise<CashRegister> {
        const register = this.registerRepository.create({
            restaurantId,
            name,
            active: true,
        });
        return this.registerRepository.save(register);
    }

    /**
     * Restorandaki tüm kasaları, durumlarıyla birlikte getirir.
     */
    async getRegistersWithStatus(restaurantId: string): Promise<any[]> {
        const registers = await this.registerRepository.find({
            where: { restaurantId },
            order: { created_at: 'ASC' } as any,
        });

        const registersWithStatus = await Promise.all(
            registers.map(async (reg) => {
                const activeSession = await this.sessionRepository.findOneBy({
                    cashRegisterId: reg.id,
                    status: CashSessionStatus.OPEN,
                });

                let currentBalance = 0;
                if (activeSession) {
                    const movements = await this.movementRepository.findBy({ cashSessionId: activeSession.id });
                    const netCashChange = movements.reduce((acc, mov) => {
                        if (mov.paymentMethod !== PaymentMethod.CASH) return acc;
                        if (mov.type === CashMovementType.OUT) return acc - Number(mov.amount);
                        return acc + Number(mov.amount);
                    }, 0);
                    currentBalance = Number(activeSession.openingBalance) + netCashChange;
                }

                return {
                    ...reg,
                    status: activeSession ? 'open' : 'closed',
                    activeSession: activeSession ? {
                        id: activeSession.id,
                        openedAt: activeSession.openedAt,
                        openedBy: activeSession.openedBy,
                        openingBalance: activeSession.openingBalance,
                        currentBalance,
                    } : null,
                };
            })
        );

        return registersWithStatus;
    }

    /**
     * Tüm açık kasa oturumlarını getirir (restoran genelinde).
     */
    async getAllActiveSessions(restaurantId: string): Promise<any[]> {
        const registers = await this.registerRepository.find({
            where: { restaurantId, active: true },
        });

        const activeSessions: any[] = [];
        for (const reg of registers) {
            const session = await this.sessionRepository.findOne({
                where: { cashRegisterId: reg.id, status: CashSessionStatus.OPEN },
                relations: ['openedBy', 'movements'],
            });

            if (session) {
                const movements = await this.movementRepository.findBy({ cashSessionId: session.id });
                const netCashChange = movements.reduce((acc, mov) => {
                    if (mov.paymentMethod !== PaymentMethod.CASH) return acc;
                    if (mov.type === CashMovementType.OUT) return acc - Number(mov.amount);
                    return acc + Number(mov.amount);
                }, 0);

                activeSessions.push({
                    register: reg,
                    session,
                    currentBalance: Number(session.openingBalance) + netCashChange,
                    netCashChange,
                });
            }
        }

        return activeSessions;
    }
}
