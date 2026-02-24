import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Restaurant } from '../restaurants/entities/restaurant.entity'
import { User } from '../users/entities/user.entity'
import { AuditModule } from '../audit/audit.module'
import { MailModule } from '../mail/mail.module'
import { PasswordService } from '../../common/services/password.service'
import { SuperAdminGuard } from '../../common/guards/super-admin.guard'
import { AuditInterceptor } from '../../common/interceptors/audit.interceptor'
import { SuperAdminRestaurantsController } from './controllers/super-admin-restaurants.controller'
import { SuperAdminUsersController } from './controllers/super-admin-users.controller'
import { SuperAdminDashboardController } from './controllers/super-admin-dashboard.controller'
import { SuperAdminRestaurantsService } from './services/super-admin-restaurants.service'
import { SuperAdminUsersService } from './services/super-admin-users.service'

@Module({
    imports: [
        TypeOrmModule.forFeature([Restaurant, User]),
        AuditModule,
        MailModule
    ],
    controllers: [
        SuperAdminRestaurantsController,
        SuperAdminUsersController,
        SuperAdminDashboardController
    ],
    providers: [
        SuperAdminRestaurantsService,
        SuperAdminUsersService,
        PasswordService,
        SuperAdminGuard,
        AuditInterceptor
    ],
    exports: [
        SuperAdminRestaurantsService,
        SuperAdminUsersService
    ]
})
export class SuperAdminModule { }
