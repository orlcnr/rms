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
  ) {
    console.log('[DEBUG Guard] Constructor called');
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractTokenFromHeader(request);

    console.log(
      '[DEBUG Guard] Token extracted:',
      token ? 'Present' : 'Missing',
    );

    if (!token) {
      console.log('[DEBUG Guard] No token found in header');
      throw new UnauthorizedException('Guest access token required');
    }

    try {
      const secret =
        this.configService.get<string>('GUEST_JWT_SECRET') ||
        this.configService.get<string>('JWT_SECRET') ||
        'guestFallbackSecret';

      console.log(
        '[DEBUG Guard] Verifying JWT with secret starting with:',
        secret.substring(0, 10) + '...',
      );

      const payload = this.jwtService.verify<GuestAccessTokenPayload>(token, {
        secret,
      });

      console.log('[DEBUG Guard] JWT verified. Payload:', {
        sessionId: payload.sessionId,
        type: payload.type,
      });

      // Verify it's a guest token
      if (payload.type !== 'guest') {
        console.log('[DEBUG Guard] Invalid token type:', payload.type);
        throw new UnauthorizedException('Invalid token type');
      }

      // Verify session is still active
      console.log(
        '[DEBUG Guard] Getting session from Redis:',
        payload.sessionId,
      );
      const session = await this.guestSessionsService.getSession(
        payload.sessionId,
      );

      if (!session) {
        console.log(
          '[DEBUG Guard] Session not found in Redis:',
          payload.sessionId,
        );
        throw new UnauthorizedException('Session expired or revoked');
      }

      console.log('[DEBUG Guard] Session found and valid:', session.id);

      // Attach session to request
      request['guestSession'] = session;

      return true;
    } catch (error) {
      console.log('[DEBUG Guard] Error:', error.message);
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid guest access token');
    }
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const authHeader = request.headers.authorization;
    console.log('[DEBUG Guard] Authorization header:', authHeader);
    const [type, token] = authHeader?.split(' ') ?? [];
    console.log(
      '[DEBUG Guard] Extracted type:',
      type,
      'token present:',
      !!token,
    );
    return type === 'Bearer' ? token : undefined;
  }
}
