import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Role } from '../../../common/enums/role.enum';
import { readCookie } from '../../../common/utils/cookie.util';

@Injectable()
export class SuperAdminRefreshStrategy extends PassportStrategy(
  Strategy,
  'super-admin-refresh',
) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: { headers?: { cookie?: string } }) =>
          readCookie(request?.headers?.cookie, 'admin_refresh_token') || null,
      ]),
      ignoreExpiration: false,
      secretOrKey:
        configService.get<string>('SUPER_ADMIN_REFRESH_JWT_SECRET') ||
        configService.get<string>('SUPER_ADMIN_JWT_SECRET') ||
        configService.get<string>('JWT_SECRET') ||
        'fallbackSecret',
    });
  }

  async validate(payload: any) {
    if (
      payload.scope !== 'super_admin' ||
      payload.token_type !== 'refresh' ||
      payload.role !== Role.SUPER_ADMIN
    ) {
      throw new UnauthorizedException('Invalid super admin refresh token');
    }

    return payload;
  }
}
