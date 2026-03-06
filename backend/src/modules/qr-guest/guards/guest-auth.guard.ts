import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { GuestSessionsService } from '../services/guest-sessions.service';
import { GuestAccessTokenPayload } from '../interfaces';

@Injectable()
export class GuestAuthGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    private guestSessionsService: GuestSessionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('Guest access token required');
    }

    try {
      const secret =
        this.configService.get<string>('GUEST_JWT_SECRET') ||
        this.configService.get<string>('JWT_SECRET') ||
        'guestFallbackSecret';

      const payload = this.jwtService.verify<GuestAccessTokenPayload>(token, {
        secret,
      });

      // Verify it's a guest token
      if (payload.type !== 'guest') {
        throw new UnauthorizedException('Invalid token type');
      }

      // Verify session is still active
      const session = await this.guestSessionsService.getSession(
        payload.sessionId,
      );

      if (!session) {
        throw new UnauthorizedException('Session expired or revoked');
      }

      const currentServiceCycleVersion =
        await this.guestSessionsService.getCurrentServiceCycleVersion(
          session.tableId,
        );

      if (!currentServiceCycleVersion) {
        throw new UnauthorizedException('Session expired or revoked');
      }

      if (
        this.guestSessionsService.normalizeServiceCycleVersion(
          session.serviceCycleVersion,
        ) !== currentServiceCycleVersion
      ) {
        throw new UnauthorizedException('Session expired or revoked');
      }

      // Attach session to request
      request['guestSession'] = session;
      request['branchId'] = session.restaurantId;

      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid guest access token');
    }
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const authHeader = request.headers.authorization;
    const [type, token] = authHeader?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
