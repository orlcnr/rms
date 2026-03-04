import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from '../users/users.module';
import { AuditModule } from '../audit/audit.module';
import { SuperAdminAuthController } from './super-admin-auth.controller';
import { SuperAdminAuthService } from './super-admin-auth.service';
import { SuperAdminJwtStrategy } from './strategies/super-admin-jwt.strategy';
import { SuperAdminRefreshStrategy } from './strategies/super-admin-refresh.strategy';
import { SuperAdminLocalStrategy } from './strategies/super-admin-local.strategy';
import { PasswordService } from '../../common/services/password.service';
import { User } from '../users/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    UsersModule,
    AuditModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret:
          configService.get<string>('SUPER_ADMIN_JWT_SECRET') ||
          configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: '15m' as const,
        },
      }),
    }),
  ],
  controllers: [SuperAdminAuthController],
  providers: [
    SuperAdminAuthService,
    SuperAdminJwtStrategy,
    SuperAdminRefreshStrategy,
    SuperAdminLocalStrategy,
    PasswordService,
  ],
  exports: [SuperAdminAuthService],
})
export class SuperAdminAuthModule {}
