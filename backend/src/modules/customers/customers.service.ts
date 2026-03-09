import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import type { Request } from 'express';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Customer } from './entities/customer.entity';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { paginate, Pagination } from 'nestjs-typeorm-paginate';
import { GetCustomersDto } from './dto/get-customers.dto';
import { Order } from '../orders/entities/order.entity';
import type { User } from '../users/entities/user.entity';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/enums/audit-action.enum';
import { sanitizeAuditChanges } from '../audit/utils/sanitize-audit.util';

@Injectable()
export class CustomersService {
  private readonly logger = new Logger(CustomersService.name);

  constructor(
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    private readonly auditService: AuditService,
  ) {}

  private buildActorName(user?: User): string | undefined {
    if (!user?.first_name) {
      return undefined;
    }
    return `${user.first_name} ${user.last_name || ''}`.trim();
  }

  private async emitDomainAudit(params: {
    action: AuditAction;
    restaurantId?: string;
    payload?: Record<string, unknown>;
    changes?: {
      before?: Record<string, unknown>;
      after?: Record<string, unknown>;
      meta?: Record<string, unknown>;
    };
    actor?: User;
    request?: Request;
    context: string;
  }): Promise<void> {
    const headerUserAgent = params.request?.headers?.['user-agent'];
    const userAgent =
      typeof headerUserAgent === 'string'
        ? headerUserAgent
        : headerUserAgent?.[0];

    try {
      await this.auditService.safeEmitLog(
        {
          action: params.action,
          resource: 'CUSTOMERS',
          user_id: params.actor?.id,
          user_name: this.buildActorName(params.actor),
          restaurant_id: params.restaurantId,
          payload: params.payload,
          changes: params.changes,
          ip_address: params.request?.ip,
          user_agent: userAgent,
        },
        params.context,
      );
      this.auditService.markRequestAsAudited(
        params.request as unknown as Record<string, unknown>,
      );
    } catch (error) {
      this.logger.warn(
        `Audit fail-open in ${params.context}: ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      );
    }
  }

  async create(
    createCustomerDto: CreateCustomerDto,
    restaurantId: string,
    actor?: User,
    request?: Request,
  ): Promise<Customer> {
    // Validate phone is provided
    if (!createCustomerDto.phone) {
      throw new BadRequestException('Phone number is required');
    }

    const existing = await this.customerRepository
      .createQueryBuilder('customer')
      .where('customer.phone = :phone', { phone: createCustomerDto.phone })
      .andWhere('customer.restaurantId = :restaurantId', { restaurantId })
      .andWhere('customer.deleted_at IS NULL')
      .getOne();
    if (existing) {
      throw new ConflictException(
        'Bu telefon numarası ile kayıtlı bir müşteri zaten var',
      );
    }

    try {
      const customer = this.customerRepository.create({
        ...createCustomerDto,
        restaurantId,
      });
      const savedCustomer = await this.customerRepository.save(customer);
      await this.emitDomainAudit({
        action: AuditAction.CUSTOMER_CREATED,
        restaurantId,
        payload: { customerId: savedCustomer.id },
        changes: sanitizeAuditChanges({
          after: {
            id: savedCustomer.id,
            first_name: savedCustomer.first_name,
            last_name: savedCustomer.last_name,
            phone: savedCustomer.phone,
          },
        }),
        actor,
        request,
        context: 'CustomersService.create',
      });
      return savedCustomer;
    } catch (error) {
      const errorCode =
        error &&
        typeof error === 'object' &&
        'code' in error &&
        typeof (error as { code?: unknown }).code === 'string'
          ? (error as { code: string }).code
          : undefined;

      // Handle unique constraint violation from database
      if (errorCode === '23505') {
        throw new ConflictException(
          'Bu telefon numarası başka bir müşteri tarafından kullanılıyor',
        );
      }
      throw error;
    }
  }

  async findAll(
    queryDto: GetCustomersDto,
    restaurantId: string,
  ): Promise<Pagination<Customer>> {
    const { page = 1, limit = 10, search } = queryDto;

    const queryBuilder = this.customerRepository.createQueryBuilder('customer');

    // Multi-tenant: Always filter by restaurant
    queryBuilder
      .where('customer.restaurantId = :restaurantId', {
        restaurantId,
      })
      .andWhere('customer.deleted_at IS NULL');

    if (search) {
      queryBuilder.andWhere(
        '(customer.first_name ILIKE :search OR customer.last_name ILIKE :search OR customer.phone ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (queryDto.hasDebt) {
      queryBuilder.andWhere('customer.current_debt > 0');
    }

    queryBuilder
      .orderBy('customer.last_visit', 'DESC')
      .addOrderBy('customer.first_name', 'ASC');

    return paginate<Customer>(queryBuilder, { page, limit });
  }

  async findOne(id: string, restaurantId: string): Promise<Customer> {
    const customer = await this.customerRepository
      .createQueryBuilder('customer')
      .where('customer.id = :id', { id })
      .andWhere('customer.restaurantId = :restaurantId', { restaurantId })
      .andWhere('customer.deleted_at IS NULL')
      .getOne();
    if (!customer)
      throw new NotFoundException(`Customer with ID ${id} not found`);
    return customer;
  }

  async search(query: string, restaurantId: string): Promise<Customer[]> {
    if (!query) return [];

    // Search by phone (exact or partial) or name (partial case-insensitive)
    return this.customerRepository
      .createQueryBuilder('customer')
      .where('customer.restaurantId = :restaurantId', { restaurantId })
      .andWhere('customer.deleted_at IS NULL')
      .andWhere(
        'customer.phone LIKE :query OR customer.first_name ILIKE :query OR customer.last_name ILIKE :query',
        { query: `%${query}%` },
      )
      .take(10)
      .getMany();
  }

  async findByPhone(
    phone: string,
    restaurantId: string,
  ): Promise<Customer | null> {
    return this.customerRepository
      .createQueryBuilder('customer')
      .where('customer.phone = :phone', { phone })
      .andWhere('customer.restaurantId = :restaurantId', { restaurantId })
      .andWhere('customer.deleted_at IS NULL')
      .getOne();
  }

  async update(
    id: string,
    updateCustomerDto: Partial<CreateCustomerDto>,
    restaurantId: string,
    actor?: User,
    request?: Request,
  ): Promise<Customer> {
    const customer = await this.findOne(id, restaurantId);
    const beforeSnapshot = {
      first_name: customer.first_name,
      last_name: customer.last_name,
      phone: customer.phone,
      email: customer.email,
    };

    // If phone is being updated, check for existing
    if (updateCustomerDto.phone && updateCustomerDto.phone !== customer.phone) {
      const existing = await this.customerRepository
        .createQueryBuilder('customer')
        .where('customer.phone = :phone', { phone: updateCustomerDto.phone })
        .andWhere('customer.restaurantId = :restaurantId', { restaurantId })
        .andWhere('customer.deleted_at IS NULL')
        .getOne();
      if (existing) {
        throw new ConflictException(
          'Bu telefon numarası ile kayıtlı bir müşteri zaten var',
        );
      }
    }

    Object.assign(customer, updateCustomerDto);

    try {
      const savedCustomer = await this.customerRepository.save(customer);
      await this.emitDomainAudit({
        action: AuditAction.CUSTOMER_UPDATED,
        restaurantId,
        payload: { customerId: savedCustomer.id },
        changes: sanitizeAuditChanges({
          before: beforeSnapshot,
          after: {
            first_name: savedCustomer.first_name,
            last_name: savedCustomer.last_name,
            phone: savedCustomer.phone,
            email: savedCustomer.email,
          },
        }),
        actor,
        request,
        context: 'CustomersService.update',
      });
      return savedCustomer;
    } catch (error) {
      const errorCode =
        error &&
        typeof error === 'object' &&
        'code' in error &&
        typeof (error as { code?: unknown }).code === 'string'
          ? (error as { code: string }).code
          : undefined;

      if (errorCode === '23505') {
        throw new ConflictException(
          'Bu telefon numarası başka bir müşteri tarafından kullanılıyor',
        );
      }
      throw error;
    }
  }

  async updateStats(
    id: string,
    restaurantId: string,
    amountSpent: number,
  ): Promise<void> {
    const customer = await this.findOne(id, restaurantId);
    customer.visit_count += 1;
    customer.total_spent = Number(customer.total_spent) + Number(amountSpent);
    customer.last_visit = new Date();
    await this.customerRepository.save(customer);
  }

  async remove(
    id: string,
    restaurantId: string,
    actor?: User,
    request?: Request,
  ): Promise<void> {
    const customer = await this.findOne(id, restaurantId);
    await this.customerRepository.softRemove(customer);
    await this.emitDomainAudit({
      action: AuditAction.CUSTOMER_DELETED,
      restaurantId,
      payload: { customerId: customer.id },
      changes: sanitizeAuditChanges({
        before: {
          id: customer.id,
          first_name: customer.first_name,
          last_name: customer.last_name,
          phone: customer.phone,
        },
        after: { deleted: true },
      }),
      actor,
      request,
      context: 'CustomersService.remove',
    });
  }

  async getCustomerOrders(id: string, restaurantId: string): Promise<Order[]> {
    // Validate customer exists
    await this.findOne(id, restaurantId);

    return this.orderRepository.find({
      where: { customerId: id, restaurantId },
      relations: ['items', 'items.menuItem', 'table'],
      order: { created_at: 'DESC' },
    });
  }
}
