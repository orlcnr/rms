import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SnakeNamingStrategy } from './common/strategies/snake-naming.strategy';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { RestaurantsModule } from './modules/restaurants/restaurants.module';
import { MenusModule } from './modules/menus/menus.module';
import { TablesModule } from './modules/tables/tables.module';
import { ReservationsModule } from './modules/reservations/reservations.module';
import { OrdersModule } from './modules/orders/orders.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { FilesModule } from './modules/files/files.module';
import { SeedsModule } from './database/seeds/seeds.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { InventoryModule } from './modules/inventory/inventory.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { CustomersModule } from './modules/customers/customers.module';
import { AuditModule } from './modules/audit/audit.module';
import { ReportsModule } from './modules/reports/reports.module';
import { QrGuestModule } from './modules/qr-guest/qr-guest.module';
import { DebugModule } from './modules/debug/debug.module';
import { CacheModule } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-redis-yet';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { CashModule } from './modules/cash/cash.module';
import { SuperAdminModule } from './modules/super-admin/super-admin.module';
import { MailModule } from './modules/mail/mail.module';
import { RulesModule } from './modules/rules/rules.module';
import { SettingsModule } from './modules/settings/settings.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    EventEmitterModule.forRoot({
      global: true,
      wildcard: true,
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 60 saniye
        limit: 100, // 60 saniyede maksimum 100 istek
      },
    ]),
    CacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        store: await redisStore({
          socket: {
            host: configService.get<string>('REDIS_HOST') || 'localhost',
            port: configService.get<number>('REDIS_PORT') || 6379,
          },
          ttl: 3600, // 60 minutes (seconds in v5+)
        }),
      }),
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DB_HOST'),
        port: configService.get<number>('DB_PORT'),
        username: configService.get<string>('DB_USERNAME'),
        password: configService.get<string>('DB_PASSWORD'),
        database: configService.get<string>('DB_NAME'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: false,
        logging: configService.get<string>('NODE_ENV') === 'development',
        schema: 'business', // Default schema
        extra: {
          // Set search path for cross-schema queries
          options:
            '-c search_path=business,operations,public_api,infrastructure,public',
        },
        namingStrategy: new SnakeNamingStrategy(),
      }),
    }),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'uploads'),
      serveRoot: '/uploads',
    }),
    UsersModule,
    AuthModule,
    RestaurantsModule,
    MenusModule,
    TablesModule,
    ReservationsModule,
    OrdersModule,
    PaymentsModule,
    FilesModule,
    NotificationsModule,
    SeedsModule,
    InventoryModule,
    AnalyticsModule,
    CustomersModule,
    AuditModule,
    ReportsModule,
    QrGuestModule,
    CashModule,
    SuperAdminModule,
    MailModule,
    SettingsModule,
    DebugModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
