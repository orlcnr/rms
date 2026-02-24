import { Controller, Get, UseGuards, UseInterceptors } from '@nestjs/common'
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard'
import { SuperAdminGuard } from '../../../common/guards/super-admin.guard'
import { AuditInterceptor } from '../../../common/interceptors/audit.interceptor'
import { SuperAdminRestaurantsService } from '../services/super-admin-restaurants.service'
import { SuperAdminUsersService } from '../services/super-admin-users.service'

@Controller('super-admin/dashboard')
@UseGuards(JwtAuthGuard, SuperAdminGuard)
@UseInterceptors(AuditInterceptor)
export class SuperAdminDashboardController {
    constructor(
        private readonly restaurantsService: SuperAdminRestaurantsService,
        private readonly usersService: SuperAdminUsersService
    ) { }

    @Get('stats')
    async getStats() {
        const [restaurantStats, userStats] = await Promise.all([
            this.restaurantsService.getStats(),
            this.usersService.getStats()
        ])

        return {
            restaurants: restaurantStats,
            users: userStats
        }
    }
}
