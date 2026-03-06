import { Controller, Get, UseGuards, UseInterceptors } from '@nestjs/common';
import { SuperAdminGuard } from '../../../common/guards/super-admin.guard';
import { AuditInterceptor } from '../../../common/interceptors/audit.interceptor';
import { SuperAdminRestaurantsService } from '../services/super-admin-restaurants.service';
import { SuperAdminUsersService } from '../services/super-admin-users.service';
import { SuperAdminJwtAuthGuard } from '../../super-admin-auth/guards/super-admin-jwt-auth.guard';
import { AuditSearchService } from '../../audit/audit-search.service';
import { subDays } from 'date-fns';

@Controller('super-admin/dashboard')
@UseGuards(SuperAdminJwtAuthGuard, SuperAdminGuard)
@UseInterceptors(AuditInterceptor)
export class SuperAdminDashboardController {
  constructor(
    private readonly restaurantsService: SuperAdminRestaurantsService,
    private readonly usersService: SuperAdminUsersService,
    private readonly auditSearchService: AuditSearchService,
  ) {}

  @Get('stats')
  async getStats() {
    const [restaurantStats, userStats, recentRestaurants, auditSummary] =
      await Promise.all([
        this.restaurantsService.getStats(),
        this.usersService.getStats(),
        this.restaurantsService.getRecent(5),
        this.auditSearchService.findAll({
          page: 1,
          limit: 1,
          start_date: subDays(new Date(), 1).toISOString(),
          end_date: new Date().toISOString(),
        }),
      ]);

    return {
      restaurants: restaurantStats,
      users: userStats,
      audit: {
        last_24h_count: auditSummary.meta.totalItems,
      },
      recent_restaurants: recentRestaurants,
    };
  }
}
