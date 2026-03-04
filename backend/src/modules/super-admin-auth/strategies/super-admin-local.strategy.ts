import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { SuperAdminAuthService } from '../super-admin-auth.service';

@Injectable()
export class SuperAdminLocalStrategy extends PassportStrategy(
  Strategy,
  'super-admin-local',
) {
  constructor(private readonly superAdminAuthService: SuperAdminAuthService) {
    super({ usernameField: 'email' });
  }

  async validate(email: string, password: string) {
    const user = await this.superAdminAuthService.validateSuperAdminCredentials(
      email,
      password,
    );

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return user;
  }
}
