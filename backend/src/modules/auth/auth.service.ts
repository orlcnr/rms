import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async validateUser(email: string, pass: string): Promise<any> {
    const user = await this.usersService.findByEmail(email, [
      'restaurant',
      'restaurant.brand',
    ]);
    if (user && (await bcrypt.compare(pass, user.password_hash))) {
      const { password_hash, ...result } = user;
      return result;
    }
    return null;
  }

  async login(user: any) {
    const branchId = user.restaurant_id || null;
    const brandId = user.restaurant?.brand_id || null;

    const payload = {
      email: user.email,
      sub: user.id,
      role: user.role,
      restaurantId: user.restaurant_id,
      branchId,
      brandId,
      tokenVersion: Number(user.token_version || 1),
      first_name: user.first_name,
      last_name: user.last_name,
    };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }
}
