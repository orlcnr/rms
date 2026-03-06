import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Request } from 'express';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from '../entities/category.entity';
import { CreateCategoryDto } from '../dto/create-category.dto';
import { UpdateCategoryDto } from '../dto/update-category.dto';
import { CategoryRepository } from '../repositories/category.repository';
import { Restaurant } from '../../restaurants/entities/restaurant.entity';
import { AuditService } from '../../audit/audit.service';
import { AuditAction } from '../../audit/enums/audit-action.enum';
import { sanitizeAuditChanges } from '../../audit/utils/sanitize-audit.util';
import type { User } from '../../users/entities/user.entity';

@Injectable()
export class CategoriesService {
  constructor(
    private readonly categoryRepository: CategoryRepository,
    @InjectRepository(Restaurant)
    private readonly restaurantRepository: Repository<Restaurant>,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    private readonly auditService: AuditService,
  ) {}

  private buildActorName(user?: User): string | undefined {
    if (!user?.first_name) {
      return undefined;
    }
    return `${user.first_name} ${user.last_name || ''}`.trim();
  }

  private getCacheKey(restaurantId: string): string {
    return `menus:categories:${restaurantId}`;
  }

  async clearCache(restaurantId: string): Promise<void> {
    await this.cacheManager.del(this.getCacheKey(restaurantId));
  }

  async create(
    createCategoryDto: CreateCategoryDto,
    actor?: User,
    request?: Request,
  ): Promise<Category> {
    const restaurant = await this.restaurantRepository.findOne({
      where: { id: createCategoryDto.restaurant_id },
      select: ['id', 'brand_id'],
    });

    if (!restaurant) {
      throw new NotFoundException(
        `Restaurant #${createCategoryDto.restaurant_id} not found`,
      );
    }

    const saved = await this.categoryRepository.createAndSave({
      ...createCategoryDto,
      brand_id: restaurant.brand_id,
    });
    await this.clearCache(createCategoryDto.restaurant_id);

    await this.auditService.safeEmitLog(
      {
        action: AuditAction.MENU_CATEGORY_CREATED,
        resource: 'MENUS',
        user_id: actor?.id,
        user_name: this.buildActorName(actor),
        restaurant_id: createCategoryDto.restaurant_id,
        payload: {
          categoryId: saved.id,
          restaurantId: createCategoryDto.restaurant_id,
        },
        changes: sanitizeAuditChanges({
          after: {
            id: saved.id,
            name: saved.name,
            description: saved.description,
            restaurant_id: saved.restaurant_id,
            brand_id: saved.brand_id,
          },
        }),
        ip_address: request?.ip,
        user_agent: request?.headers['user-agent'],
      },
      'CategoriesService.create',
    );
    this.auditService.markRequestAsAudited(
      request as unknown as Record<string, unknown>,
    );

    return saved;
  }

  async findAllByRestaurant(restaurantId: string): Promise<Category[]> {
    const cacheKey = this.getCacheKey(restaurantId);
    const cached = await this.cacheManager.get<Category[]>(cacheKey);

    if (cached) {
      return cached;
    }

    const categories =
      await this.categoryRepository.findByRestaurantWithItems(restaurantId);
    await this.cacheManager.set(cacheKey, categories);
    return categories;
  }

  async update(
    id: string,
    updateCategoryDto: UpdateCategoryDto,
    actor?: User,
    request?: Request,
  ): Promise<Category> {
    const existing = await this.categoryRepository.findById(id);
    if (!existing) {
      throw new NotFoundException(`Category #${id} not found`);
    }

    const beforeSnapshot = {
      id: existing.id,
      name: existing.name,
      description: existing.description,
      restaurant_id: existing.restaurant_id,
      brand_id: existing.brand_id,
    };

    const saved = await this.categoryRepository.preloadAndSave(
      id,
      updateCategoryDto,
    );
    if (!saved) {
      throw new NotFoundException(`Category #${id} not found`);
    }

    await this.clearCache(saved.restaurant_id);

    await this.auditService.safeEmitLog(
      {
        action: AuditAction.MENU_CATEGORY_UPDATED,
        resource: 'MENUS',
        user_id: actor?.id,
        user_name: this.buildActorName(actor),
        restaurant_id: saved.restaurant_id,
        payload: {
          categoryId: id,
          restaurantId: saved.restaurant_id,
        },
        changes: sanitizeAuditChanges({
          before: beforeSnapshot,
          after: {
            id: saved.id,
            name: saved.name,
            description: saved.description,
            restaurant_id: saved.restaurant_id,
            brand_id: saved.brand_id,
          },
        }),
        ip_address: request?.ip,
        user_agent: request?.headers['user-agent'],
      },
      'CategoriesService.update',
    );
    this.auditService.markRequestAsAudited(
      request as unknown as Record<string, unknown>,
    );

    return saved;
  }

  async delete(id: string, actor?: User, request?: Request): Promise<void> {
    const category = await this.categoryRepository.findById(id);

    if (!category) {
      throw new NotFoundException(`Category #${id} not found`);
    }

    await this.categoryRepository.deleteById(id);
    await this.clearCache(category.restaurant_id);

    await this.auditService.safeEmitLog(
      {
        action: AuditAction.MENU_CATEGORY_DELETED,
        resource: 'MENUS',
        user_id: actor?.id,
        user_name: this.buildActorName(actor),
        restaurant_id: category.restaurant_id,
        payload: {
          categoryId: id,
          restaurantId: category.restaurant_id,
        },
        changes: sanitizeAuditChanges({
          before: {
            id: category.id,
            name: category.name,
            description: category.description,
            restaurant_id: category.restaurant_id,
            brand_id: category.brand_id,
          },
        }),
        ip_address: request?.ip,
        user_agent: request?.headers['user-agent'],
      },
      'CategoriesService.delete',
    );
    this.auditService.markRequestAsAudited(
      request as unknown as Record<string, unknown>,
    );
  }
}
