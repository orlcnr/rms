import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') || 'fallbackSecret',
    });
  }

  async validate(payload: any) {
    // Database'den user'ı restaurant bilgisi ile çek
    const user = await this.usersService.findByEmail(payload.email, [
      'restaurant',
      'restaurant.brand',
    ]);

    if (!user) {
      throw new UnauthorizedException('Invalid token');
    }

    const brandId = user.restaurant?.brand_id || null;
    const branchId = user.restaurant_id || null;
    const scopedRoles = await this.usersService.getScopedRoles(
      user.id,
      brandId,
      branchId,
    );

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      roles: scopedRoles,
      brandId,
      branchId,
      restaurantId: user.restaurant_id,
      restaurant_id: user.restaurant_id,
      first_name: user.first_name,
      last_name: user.last_name,
    };
  }
}
