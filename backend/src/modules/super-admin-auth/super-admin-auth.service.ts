import {
  HttpException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { type Cache } from 'cache-manager';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createHmac, randomUUID } from 'crypto';
import type { Request } from 'express';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UsersService } from '../users/users.service';
import { PasswordService } from '../../common/services/password.service';
import { Role } from '../../common/enums/role.enum';
import { AuditService } from '../audit/audit.service';
import { User } from '../users/entities/user.entity';

const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_TTL = '7d';
const EMAIL_BURST_TTL_SECONDS = 60 * 30;
const EMAIL_DAILY_TTL_SECONDS = 60 * 60 * 24;

interface LockState {
  count: number;
}

@Injectable()
export class SuperAdminAuthService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly usersService: UsersService,
    private readonly passwordService: PasswordService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly auditService: AuditService,
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
  ) {}

  async validateSuperAdminCredentials(email: string, password: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await this.usersService.findByEmail(normalizedEmail);

    if (!user || user.role !== Role.SUPER_ADMIN || user.restaurant_id !== null) {
      return null;
    }

    const isValid = await this.passwordService.comparePassword(
      password,
      user.password_hash,
    );

    return isValid ? user : null;
  }

  async login(
    email: string,
    password: string,
    request: Request,
  ): Promise<{
    access_token: string;
    refresh_token: string;
    must_change_password: boolean;
  }> {
    const normalizedEmail = email.trim().toLowerCase();
    await this.assertEmailNotLocked(normalizedEmail, request);

    const user = await this.validateSuperAdminCredentials(
      normalizedEmail,
      password,
    );

    if (!user) {
      await this.registerFailedAttempt(normalizedEmail, request);
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.clearFailedAttempts(normalizedEmail);

    const tokens = await this.issueTokens({
      id: user.id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      must_change_password: user.must_change_password,
    });

    await this.auditService.emitLog({
      action: 'SUPER_ADMIN_LOGIN_SUCCEEDED',
      resource: 'super-admin-auth',
      user_id: user.id,
      payload: {
        ip: request.ip,
        user_agent: request.get('user-agent'),
      },
    });

    return {
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
      must_change_password: user.must_change_password,
    };
  }

  async refresh(refreshToken: string) {
    const payload = await this.jwtService.verifyAsync(refreshToken, {
      secret:
        this.configService.get<string>('SUPER_ADMIN_REFRESH_JWT_SECRET') ||
        this.configService.get<string>('SUPER_ADMIN_JWT_SECRET') ||
        this.configService.get<string>('JWT_SECRET'),
    });

    if (
      payload.scope !== 'super_admin' ||
      payload.token_type !== 'refresh' ||
      payload.role !== Role.SUPER_ADMIN
    ) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const digest = this.getRefreshDigest(refreshToken);
    const storedSession = await this.cacheManager.get<string>(
      this.getRefreshSessionKey(digest),
    );

    if (!storedSession) {
      throw new UnauthorizedException('Refresh token expired');
    }

    const session = JSON.parse(storedSession) as { userId: string; tokenId: string };

    if (session.userId !== payload.sub || session.tokenId !== payload.jti) {
      throw new UnauthorizedException('Refresh token expired');
    }

    await this.cacheManager.del(this.getRefreshSessionKey(digest));

    const user = await this.usersService.findByEmail(payload.email);

    if (!user || user.role !== Role.SUPER_ADMIN) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const tokens = await this.issueTokens({
      id: user.id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      must_change_password: user.must_change_password,
    });

    return {
      ...tokens,
      must_change_password: user.must_change_password,
    };
  }

  async logout(refreshToken?: string) {
    if (!refreshToken) {
      return { success: true };
    }

    const digest = this.getRefreshDigest(refreshToken);
    await this.cacheManager.del(this.getRefreshSessionKey(digest));

    return { success: true };
  }

  async getProfile(userId: string) {
    const user = await this.usersService.findOne(userId);

    return {
      id: user.id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      role: user.role,
      must_change_password: user.must_change_password,
    };
  }

  async changePassword(userId: string, password: string) {
    const currentUser = await this.usersService.findOne(userId);
    const user = await this.usersService.findByEmail(currentUser.email);

    if (!user) {
      throw new UnauthorizedException('Invalid user');
    }

    user.password_hash = await this.passwordService.hashPassword(password);
    user.must_change_password = false;

    await this.usersRepository.save(user);

    await this.auditService.emitLog({
      action: 'SUPER_ADMIN_PASSWORD_CHANGED',
      resource: 'super-admin-auth',
      user_id: user.id,
    });

    return { success: true };
  }

  private async issueTokens(user: {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    must_change_password: boolean;
  }) {
    const basePayload = {
      sub: user.id,
      email: user.email,
      role: Role.SUPER_ADMIN,
      scope: 'super_admin',
      restaurantId: null,
      first_name: user.first_name,
      last_name: user.last_name,
      must_change_password: user.must_change_password,
    };

    const accessToken = await this.jwtService.signAsync({
      ...basePayload,
      token_type: 'access',
    });

    const refreshId = randomUUID();
    const refreshToken = await this.jwtService.signAsync(
      {
        ...basePayload,
        token_type: 'refresh',
        jti: refreshId,
      },
      {
        secret:
          this.configService.get<string>('SUPER_ADMIN_REFRESH_JWT_SECRET') ||
          this.configService.get<string>('SUPER_ADMIN_JWT_SECRET') ||
          this.configService.get<string>('JWT_SECRET'),
        expiresIn: REFRESH_TOKEN_TTL,
      },
    );

    const digest = this.getRefreshDigest(refreshToken);
    await this.cacheManager.set(
      this.getRefreshSessionKey(digest),
      JSON.stringify({ userId: user.id, tokenId: refreshId }),
      60 * 60 * 24 * 7,
    );

    return {
      accessToken,
      refreshToken,
      accessTokenTtl: ACCESS_TOKEN_TTL,
      refreshTokenTtl: REFRESH_TOKEN_TTL,
    };
  }

  private getRefreshDigest(token: string): string {
    const secret =
      this.configService.get<string>('SUPER_ADMIN_REFRESH_TOKEN_HMAC_SECRET') ||
      this.configService.get<string>('SUPER_ADMIN_REFRESH_JWT_SECRET') ||
      this.configService.get<string>('SUPER_ADMIN_JWT_SECRET') ||
      'fallback-refresh-secret';

    return createHmac('sha256', secret).update(token).digest('hex');
  }

  private getRefreshSessionKey(digest: string): string {
    return `super_admin:refresh:${digest}`;
  }

  private getBurstAttemptsKey(email: string): string {
    return `super_admin:auth:burst:${email}`;
  }

  private getDailyAttemptsKey(email: string): string {
    return `super_admin:auth:daily:${email}`;
  }

  private async assertEmailNotLocked(email: string, request: Request) {
    const [burst, daily] = await Promise.all([
      this.readLockState(this.getBurstAttemptsKey(email)),
      this.readLockState(this.getDailyAttemptsKey(email)),
    ]);

    if (burst.count >= 5) {
      await this.emitThrottleAudit(email, request, 'email_lockout');
      throw new HttpException(
        'Too many login attempts. Please try again later.',
        429,
      );
    }

    if (daily.count >= 20) {
      await this.emitThrottleAudit(email, request, 'email_daily_limit');
      throw new HttpException(
        'Too many login attempts. Please try again later.',
        429,
      );
    }
  }

  private async registerFailedAttempt(email: string, request: Request) {
    await Promise.all([
      this.incrementLockState(this.getBurstAttemptsKey(email), EMAIL_BURST_TTL_SECONDS),
      this.incrementLockState(this.getDailyAttemptsKey(email), EMAIL_DAILY_TTL_SECONDS),
    ]);

    await this.auditService.emitLog({
      action: 'SUPER_ADMIN_LOGIN_FAILED',
      resource: 'super-admin-auth',
      payload: {
        email: this.maskEmail(email),
        ip: request.ip,
        user_agent: request.get('user-agent'),
      },
    });
  }

  private async clearFailedAttempts(email: string) {
    await Promise.all([
      this.cacheManager.del(this.getBurstAttemptsKey(email)),
      this.cacheManager.del(this.getDailyAttemptsKey(email)),
    ]);
  }

  private async incrementLockState(key: string, ttl: number) {
    const current = await this.readLockState(key);
    await this.cacheManager.set(
      key,
      JSON.stringify({ count: current.count + 1 }),
      ttl,
    );
  }

  private async readLockState(key: string): Promise<LockState> {
    const rawValue = await this.cacheManager.get<string>(key);

    if (!rawValue) {
      return { count: 0 };
    }

    try {
      return JSON.parse(rawValue) as LockState;
    } catch {
      return { count: 0 };
    }
  }

  private async emitThrottleAudit(
    email: string,
    request: Request,
    reason: string,
  ) {
    await this.auditService.emitLog({
      action: 'SUPER_ADMIN_LOGIN_THROTTLED',
      resource: 'super-admin-auth',
      payload: {
        email: this.maskEmail(email),
        ip: request.ip,
        user_agent: request.get('user-agent'),
        reason,
      },
    });
  }

  private maskEmail(email: string) {
    const [localPart, domain = ''] = email.split('@');
    const visible = localPart.slice(0, 2);
    return `${visible}${'*'.repeat(Math.max(localPart.length - 2, 1))}@${domain}`;
  }
}
