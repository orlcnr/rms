import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { subDays } from 'date-fns';
import { Restaurant } from '../../restaurants/entities/restaurant.entity';
import { User } from '../../users/entities/user.entity';
import { AuditSearchService } from '../../audit/audit-search.service';
import { GetSuperAdminTenantActivityDto } from '../dto/get-super-admin-tenant-activity.dto';

@Injectable()
export class SuperAdminReportsService {
  constructor(
    @InjectRepository(Restaurant)
    private readonly restaurantRepository: Repository<Restaurant>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly auditSearchService: AuditSearchService,
  ) {}

  async getTenantsOverview(query: {
    page?: number;
    limit?: number;
    search?: string;
    is_active?: boolean;
  }) {
    const { page = 1, limit = 10, search, is_active } = query;

    const qb = this.restaurantRepository
      .createQueryBuilder('restaurant')
      .leftJoinAndSelect('restaurant.owner', 'owner')
      .leftJoin('restaurant.users', 'users')
      .addSelect('COUNT(users.id)', 'user_count')
      .groupBy('restaurant.id')
      .addGroupBy('owner.id')
      .orderBy('restaurant.created_at', 'DESC');

    if (search) {
      qb.andWhere(
        '(restaurant.name ILIKE :search OR restaurant.slug ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (typeof is_active === 'boolean') {
      qb.andWhere('restaurant.is_active = :is_active', { is_active });
    }

    const [rows, total] = await Promise.all([
      qb.skip((page - 1) * limit).take(limit).getRawAndEntities(),
      this.restaurantRepository
        .createQueryBuilder('restaurant')
        .where(
          search
            ? '(restaurant.name ILIKE :search OR restaurant.slug ILIKE :search)'
            : '1=1',
          search ? { search: `%${search}%` } : {},
        )
        .andWhere(
          typeof is_active === 'boolean'
            ? 'restaurant.is_active = :is_active'
            : '1=1',
          typeof is_active === 'boolean' ? { is_active } : {},
        )
        .getCount(),
    ]);

    const items = rows.entities.map((restaurant, index) => ({
      restaurant_id: restaurant.id,
      restaurant_name: restaurant.name,
      is_active: restaurant.is_active,
      owner_email: restaurant.owner?.email || null,
      user_count: Number(rows.raw[index]?.user_count || 0),
      created_at: restaurant.created_at,
      last_activity_at: restaurant.updated_at,
    }));

    return {
      items,
      meta: {
        totalItems: total,
        itemCount: items.length,
        itemsPerPage: limit,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
      },
    };
  }

  async getTenantActivity(query: GetSuperAdminTenantActivityDto) {
    const topN = Math.min(query.topN || 10, 25);
    const startDate = query.start_date || subDays(new Date(), 30).toISOString();
    const endDate = query.end_date || new Date().toISOString();

    const [totalTenants, activeTenants, recentTenants, topTenants] =
      await Promise.all([
        this.restaurantRepository.count(),
        this.restaurantRepository.count({ where: { is_active: true } }),
        this.restaurantRepository
          .createQueryBuilder('restaurant')
          .select("DATE_TRUNC('day', restaurant.created_at)", 'date')
          .addSelect('COUNT(*)', 'count')
          .where('restaurant.created_at >= :startDate', { startDate })
          .andWhere('restaurant.created_at <= :endDate', { endDate })
          .groupBy("DATE_TRUNC('day', restaurant.created_at)")
          .orderBy("DATE_TRUNC('day', restaurant.created_at)", 'ASC')
          .getRawMany(),
        this.userRepository
          .createQueryBuilder('user')
          .leftJoin('user.restaurant', 'restaurant')
          .select('restaurant.id', 'restaurant_id')
          .addSelect('restaurant.name', 'restaurant_name')
          .addSelect('COUNT(user.id)', 'active_user_count')
          .where('user.is_active = true')
          .andWhere('restaurant.id IS NOT NULL')
          .groupBy('restaurant.id')
          .addGroupBy('restaurant.name')
          .orderBy('COUNT(user.id)', 'DESC')
          .limit(topN)
          .getRawMany(),
      ]);

    const auditSummary = await this.auditSearchService.findAll({
      page: 1,
      limit: 1,
      start_date: startDate,
      end_date: endDate,
    });

    return {
      summary: {
        total_tenants: totalTenants,
        active_tenants: activeTenants,
        suspended_tenants: totalTenants - activeTenants,
        last_24h_audit_events: auditSummary.meta.totalItems,
      },
      trends: recentTenants.map((item) => ({
        date: item.date,
        count: Number(item.count),
      })),
      top_tenants_by_active_users: topTenants.map((item) => ({
        restaurant_id: item.restaurant_id,
        restaurant_name: item.restaurant_name,
        active_user_count: Number(item.active_user_count),
      })),
      meta: {
        topN,
      },
    };
  }
}
