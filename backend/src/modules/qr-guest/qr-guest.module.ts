import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';

// Entities
import { GuestOrder, GuestOrderEvent } from './entities';
import { Table } from '../tables/entities/table.entity';
import { MenuItem } from '../menus/entities/menu-item.entity';
import { Order } from '../orders/entities/order.entity';
import { OrderItem } from '../orders/entities/order-item.entity';
import { Restaurant } from '../restaurants/entities/restaurant.entity';

// Services
import {
  GuestSessionsService,
  GuestOrdersService,
  GuestRequestsService,
} from './services';

// Controllers
import {
  GuestSessionsController,
  GuestOrdersController,
  GuestOrdersStaffController,
  GuestRequestsController,
  GuestDebugController,
} from './controllers';

// Gateway
import { GuestGateway } from './gateways/guest.gateway';

// Guards
import { GuestAuthGuard, GuestWsGuard } from './guards';

// Use Cases
import { ConvertGuestOrderUseCase } from './use-cases';

// Listeners
import { TableEventsListener } from './listeners';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      GuestOrder,
      GuestOrderEvent,
      Table,
      MenuItem,
      Order,
      OrderItem,
      Restaurant,
    ]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret:
          configService.get<string>('GUEST_JWT_SECRET') ||
          configService.get<string>('JWT_SECRET') ||
          'guestFallbackSecret',
        signOptions: {
          expiresIn: '1h', // 1 hour access token expiry
        },
      }),
    }),
  ],
  controllers: [
    GuestSessionsController,
    GuestOrdersController,
    GuestOrdersStaffController,
    GuestRequestsController,
    GuestDebugController,
  ],
  providers: [
    GuestSessionsService,
    GuestOrdersService,
    GuestRequestsService,
    GuestGateway,
    GuestAuthGuard,
    GuestWsGuard,
    ConvertGuestOrderUseCase,
    TableEventsListener,
  ],
  exports: [
    GuestSessionsService,
    GuestOrdersService,
    GuestRequestsService,
    GuestGateway,
    ConvertGuestOrderUseCase,
  ],
})
export class QrGuestModule {}
