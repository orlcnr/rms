import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import type { Request } from 'express';
import { Role } from '../../common/enums/role.enum';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Restaurant } from './entities/restaurant.entity';
import { CreateRestaurantDto } from './dto/create-restaurant.dto';
import { UpdateRestaurantDto } from './dto/update-restaurant.dto';
import { User } from '../users/entities/user.entity';
import { Brand } from '../brands/entities/brand.entity';

import { RulesService } from '../rules/rules.service';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/enums/audit-action.enum';
import { sanitizeAuditChanges } from '../audit/utils/sanitize-audit.util';
import { InitBranchStockUseCase } from '../inventory/use-cases/init-branch-stock.use-case';
import { InitBranchCostUseCase } from '../inventory/use-cases/init-branch-cost.use-case';

@Injectable()
export class RestaurantsService {
  constructor(
    @InjectRepository(Restaurant)
    private readonly restaurantRepository: Repository<Restaurant>,
    @InjectRepository(Brand)
    private readonly brandRepository: Repository<Brand>,
    private readonly dataSource: DataSource,
    private readonly rulesService: RulesService,
    private readonly auditService: AuditService,
    private readonly initBranchStockUseCase: InitBranchStockUseCase,
    private readonly initBranchCostUseCase: InitBranchCostUseCase,
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

    await this.auditService.safeEmitLog(
      {
        action: params.action,
        resource: 'RESTAURANTS',
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
  }

  async create(
    createRestaurantDto: CreateRestaurantDto,
    user: User,
    request?: Request,
  ): Promise<Restaurant> {
    try {
      const savedRestaurant = await this.dataSource.transaction(
        async (manager) => {
          const requestContext = user as User & {
            brandId?: string | null;
            restaurantId?: string | null;
          };

          let brandId =
            requestContext.brandId ||
            requestContext.restaurantId ||
            user.restaurant_id ||
            null;

          if (brandId) {
            const sourceRestaurant = await manager.findOne(Restaurant, {
              where: { id: brandId },
              select: ['id', 'brand_id'],
            });
            if (sourceRestaurant?.brand_id) {
              brandId = sourceRestaurant.brand_id;
            }
          }

          if (!brandId) {
            const brand = await manager.save(
              Brand,
              manager.create(Brand, {
                name: createRestaurantDto.name,
                owner_id: user.id,
                is_active: true,
              }),
            );
            brandId = brand.id;
          }

          const restaurant = manager.create(Restaurant, {
            ...createRestaurantDto,
            owner_id: user.id,
            brand_id: brandId,
            is_branch: true,
          });

          const createdRestaurant = await manager.save(Restaurant, restaurant);
          await this.initBranchStockUseCase.execute(
            createdRestaurant.id,
            createdRestaurant.brand_id,
            { manager },
          );
          await this.initBranchCostUseCase.execute(
            createdRestaurant.id,
            createdRestaurant.brand_id,
            { manager },
          );

          return createdRestaurant;
        },
      );
      await this.rulesService.initializeDefaultRules(savedRestaurant.id);
      await this.emitDomainAudit({
        action: AuditAction.RESTAURANT_CREATED,
        restaurantId: savedRestaurant.id,
        payload: { restaurantId: savedRestaurant.id },
        changes: sanitizeAuditChanges({
          after: {
            id: savedRestaurant.id,
            name: savedRestaurant.name,
            slug: savedRestaurant.slug,
            is_branch: savedRestaurant.is_branch,
            brand_id: savedRestaurant.brand_id,
          },
        }),
        actor: user,
        request,
        context: 'RestaurantsService.create',
      });
      return savedRestaurant;
    } catch (error: unknown) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        (error as { code?: string }).code === '23505'
      ) {
        // Postgres unique_violation
        throw new ConflictException(
          `Restaurant with slug "${createRestaurantDto.slug}" already exists`,
        );
      }
      throw error;
    }
  }

  async findAll(user: User): Promise<Restaurant[]> {
    if (user.role === Role.SUPER_ADMIN) {
      return this.restaurantRepository.find();
    }

    const requestContext = user as User & { brandId?: string | null };
    const brandId = requestContext.brandId || null;
    if (brandId) {
      return this.restaurantRepository
        .createQueryBuilder('restaurant')
        .where('restaurant.brand_id = :brandId', { brandId })
        .orWhere('restaurant.owner_id = :userId', { userId: user.id })
        .orderBy('restaurant.created_at', 'DESC')
        .getMany();
    }

    return this.restaurantRepository.find({
      where: { id: user.restaurant_id },
    });
  }

  async findOne(id: string, user: User): Promise<Restaurant> {
    const restaurant = await this.restaurantRepository.findOneBy({ id });
    if (!restaurant) {
      throw new NotFoundException(`Restaurant with ID ${id} not found`);
    }

    const requestContext = user as User & { brandId?: string | null };
    const isSameBrand =
      Boolean(requestContext.brandId) &&
      requestContext.brandId === restaurant.brand_id;
    const isOwner = restaurant.owner_id === user.id;

    if (
      user.role !== Role.SUPER_ADMIN &&
      restaurant.id !== user.restaurant_id &&
      !isSameBrand &&
      !isOwner
    ) {
      throw new ForbiddenException('You do not have access to this restaurant');
    }

    return restaurant;
  }

  async update(
    id: string,
    updateRestaurantDto: UpdateRestaurantDto,
    user: User,
    request?: Request,
  ): Promise<Restaurant> {
    const restaurant = await this.findOne(id, user); // findOne already checks access
    const beforeSnapshot = {
      name: restaurant.name,
      slug: restaurant.slug,
      address: restaurant.address,
    };
    Object.assign(restaurant, updateRestaurantDto);
    const savedRestaurant = await this.restaurantRepository.save(restaurant);
    await this.emitDomainAudit({
      action: AuditAction.RESTAURANT_UPDATED,
      restaurantId: savedRestaurant.id,
      payload: { restaurantId: savedRestaurant.id },
      changes: sanitizeAuditChanges({
        before: beforeSnapshot,
        after: {
          name: savedRestaurant.name,
          slug: savedRestaurant.slug,
          address: savedRestaurant.address,
        },
      }),
      actor: user,
      request,
      context: 'RestaurantsService.update',
    });
    return savedRestaurant;
  }

  async remove(id: string, user: User, request?: Request): Promise<void> {
    const restaurant = await this.findOne(id, user); // Ensure they have access before deleting
    const result = await this.restaurantRepository.softDelete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Restaurant with ID ${id} not found`);
    }
    await this.emitDomainAudit({
      action: AuditAction.RESTAURANT_DELETED,
      restaurantId: restaurant.id,
      payload: { restaurantId: restaurant.id },
      changes: sanitizeAuditChanges({
        before: {
          id: restaurant.id,
          name: restaurant.name,
          slug: restaurant.slug,
        },
        after: { deleted: true },
      }),
      actor: user,
      request,
      context: 'RestaurantsService.remove',
    });
  }
}
