import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsersService } from '../../users/users.service';
import { Role } from '../../../common/enums/role.enum';

@Injectable()
export class SuperAdminJwtStrategy extends PassportStrategy(
  Strategy,
  'super-admin-jwt',
) {
  constructor(
    configService: ConfigService,
    private readonly usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey:
        configService.get<string>('SUPER_ADMIN_JWT_SECRET') ||
        configService.get<string>('JWT_SECRET') ||
        'fallbackSecret',
    });
  }

  async validate(payload: any) {
    if (
      payload.scope !== 'super_admin' ||
      payload.token_type !== 'access' ||
      payload.role !== Role.SUPER_ADMIN
    ) {
      throw new UnauthorizedException('Invalid super admin token');
    }

    const user = await this.usersService.findByEmail(payload.email);

    if (
      !user ||
      user.role !== Role.SUPER_ADMIN ||
      user.restaurant_id !== null
    ) {
      throw new UnauthorizedException('Invalid super admin token');
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      restaurantId: user.restaurant_id,
      restaurant_id: user.restaurant_id,
      first_name: user.first_name,
      last_name: user.last_name,
      must_change_password: user.must_change_password,
    };
  }
}
