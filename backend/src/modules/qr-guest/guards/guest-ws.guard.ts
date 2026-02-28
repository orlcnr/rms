import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Socket } from 'socket.io';
import { GuestSessionsService } from '../services/guest-sessions.service';
import { GuestAccessTokenPayload } from '../interfaces';

@Injectable()
export class GuestWsGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    private guestSessionsService: GuestSessionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client = context.switchToWs().getClient<Socket>();
    const token = this.extractTokenFromClient(client);

    if (!token) {
      // Emit unauthorized event to client before throwing
      client.emit('unauthorized', {
        message: 'Guest access token required',
      });
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

      // Attach session to socket data
      client.data.session = session;

      return true;
    } catch (error) {
      // Emit unauthorized event to client before throwing
      client.emit('unauthorized', {
        message:
          error instanceof UnauthorizedException
            ? error.message
            : 'Invalid guest access token',
      });
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid guest access token');
    }
  }

  private extractTokenFromClient(client: Socket): string | undefined {
    // Try to get token from auth handshake
    const auth = client.handshake.auth;
    if (auth && auth.token) {
      return auth.token;
    }

    // Try to get from query params
    const query = client.handshake.query;
    if (query && query.token) {
      return query.token as string;
    }

    // Try to get from headers
    const headers = client.handshake.headers;
    const authHeader = headers.authorization;
    if (authHeader) {
      const [type, token] = authHeader.split(' ');
      if (type === 'Bearer') {
        return token;
      }
    }

    return undefined;
  }
}
