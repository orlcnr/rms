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
    ]);

    if (!user) {
      throw new UnauthorizedException('Invalid token');
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      restaurantId: user.restaurant_id,
      restaurant_id: user.restaurant_id,
      first_name: user.first_name,
      last_name: user.last_name,
    };
  }
}
