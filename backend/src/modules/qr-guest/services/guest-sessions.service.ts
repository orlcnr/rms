import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { Restaurant } from '../../restaurants/entities/restaurant.entity';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createHash, randomUUID } from 'crypto';
import { Redis } from 'ioredis';
import { Table } from '../../tables/entities/table.entity';
import {
  GuestSession,
  GuestSessionStatus,
  QrTokenPayload,
  GuestAccessTokenPayload,
  DeviceInfo,
} from '../interfaces';
import { CreateSessionDto } from '../dto';

@Injectable()
export class GuestSessionsService {
  private readonly redis: Redis;
  private readonly SESSION_TTL_SECONDS = 5 * 60 * 60; // 3 hours - session stored in Redis
  private readonly ACCESS_TOKEN_EXPIRY = '5h'; // 1 hour - JWT token expiry

  constructor(
    private configService: ConfigService,
    private jwtService: JwtService,
    @InjectRepository(Table)
    private tableRepository: Repository<Table>,
    @InjectRepository(Restaurant)
    private restaurantRepository: Repository<Restaurant>,
  ) {
    // Initialize Redis client for session management
    this.redis = new Redis({
      host: this.configService.get<string>('REDIS_HOST') || 'localhost',
      port: this.configService.get<number>('REDIS_PORT') || 6379,
    });
  }

  /**
   * Validate QR token and create a new guest session
   */
  async createSession(dto: CreateSessionDto): Promise<{
    guestAccessToken: string;
    session: GuestSession;
  }> {
    // Validate QR token
    const payload = await this.validateQrToken(dto.qrToken);

    // Verify table exists and belongs to restaurant
    const table = await this.tableRepository.findOne({
      where: { id: payload.tableId, restaurant_id: payload.restaurantId },
      relations: ['restaurant'],
    });

    if (!table) {
      throw new UnauthorizedException('Invalid QR code');
    }

    // Check if table is out of service
    if (table.status === 'out_of_service') {
      throw new BadRequestException('Table is currently out of service');
    }

    // Generate device fingerprint hash if device info provided
    const deviceFingerprintHash = dto.deviceInfo
      ? this.generateDeviceFingerprint(dto.deviceInfo)
      : undefined;

    // Create session
    const sessionId = randomUUID();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.SESSION_TTL_SECONDS * 1000);

    const session: GuestSession = {
      id: sessionId,
      restaurantId: payload.restaurantId,
      tableId: payload.tableId,
      tableName: table.name,
      googleCommentUrl: table.restaurant?.google_comment_url,
      deviceFingerprintHash,
      status: GuestSessionStatus.ACTIVE,
      createdAt: now,
      expiresAt,
      lastActivityAt: now,
    };

    // Store session in Redis
    await this.saveSession(session);

    // Add session to table's session set
    await this.redis.sadd(`table:${payload.tableId}:sessions`, sessionId);

    // Generate access token
    const guestAccessToken = this.generateAccessToken(session);

    return { guestAccessToken, session };
  }

  /**
   * Validate QR token (JWT or HMAC)
   */
  private async validateQrToken(token: string): Promise<QrTokenPayload> {
    try {
      // Try to verify as JWT
      const secret = this.configService.get<string>('QR_TOKEN_SECRET');
      const payload = this.jwtService.verify<QrTokenPayload>(token, {
        secret,
      });

      // Validate required fields
      if (
        !payload.restaurantId ||
        !payload.tableId ||
        payload.qrVersion === undefined
      ) {
        throw new UnauthorizedException('Invalid QR token');
      }

      // Verify qrVersion matches current table version
      const table = await this.tableRepository.findOne({
        where: { id: payload.tableId },
        select: ['id', 'qrVersion'],
      });

      if (!table) {
        throw new UnauthorizedException('Table not found');
      }

      if (table.qrVersion !== payload.qrVersion) {
        throw new UnauthorizedException(
          'QR code has been rotated. Please scan again.',
        );
      }

      return payload;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid QR token');
    }
  }

  /**
   * Generate device fingerprint hash
   */
  private generateDeviceFingerprint(deviceInfo: DeviceInfo): string {
    const fingerprint = JSON.stringify({
      userAgent: deviceInfo.userAgent,
      screenResolution: deviceInfo.screenResolution,
      timezone: deviceInfo.timezone,
      language: deviceInfo.language,
      platform: deviceInfo.platform,
    });
    return createHash('sha256').update(fingerprint).digest('hex');
  }

  /**
   * Save session to Redis
   */
  private async saveSession(session: GuestSession): Promise<void> {
    const key = `guestSession:${session.id}`;

    // Handle both Date object and ISO string format
    const expiresAtTime =
      session.expiresAt instanceof Date
        ? session.expiresAt.getTime()
        : new Date(session.expiresAt).getTime();
    const ttl = Math.floor((expiresAtTime - Date.now()) / 1000);

    console.log(`[DEBUG] Saving session to Redis: ${key}, TTL: ${ttl}s`);

    await this.redis.setex(key, ttl, JSON.stringify(session));

    // Verify save
    const saved = await this.redis.get(key);
    console.log(
      `[DEBUG] Session saved verification: ${saved ? 'Success' : 'Failed'}`,
    );
  }

  /**
   * Get session from Redis
   */
  async getSession(sessionId: string): Promise<GuestSession | null> {
    const key = `guestSession:${sessionId}`;

    console.log(`[DEBUG getSession] Fetching from Redis: ${key}`);

    const data = await this.redis.get(key);

    console.log(`[DEBUG getSession] Data found: ${!!data}`);

    if (!data) {
      return null;
    }

    const session: GuestSession = JSON.parse(data);

    // Auto-heal: If tableName is missing, fetch it from the database
    if (!session.tableName) {
      console.log(
        `[DEBUG getSession] Missing tableName for table ${session.tableId}, fetching...`,
      );
      const table = await this.tableRepository.findOne({
        where: { id: session.tableId },
        select: ['id', 'name'],
      });
      if (table) {
        session.tableName = table.name;
        // Update Redis with the enriched session (optional but recommended)
        await this.saveSession(session);
      }
    }

    // Parse dates properly (handle ISO string format)
    const expiresAt = new Date(session.expiresAt);
    const now = new Date();

    // Check if expired - add 5 minute buffer for clock skew
    const expiresTime = expiresAt.getTime();
    const nowTime = now.getTime();
    const bufferMs = 5 * 60 * 1000; // 5 minutes buffer

    if (expiresTime < nowTime - bufferMs) {
      console.log(
        `[DEBUG] Session expired. Expires: ${expiresAt.toISOString()}, Now: ${now.toISOString()}`,
      );
      await this.revokeSession(sessionId, 'expired');
      return null;
    }

    return session;
  }

  /**
   * Generate guest access token (JWT)
   */
  private generateAccessToken(session: GuestSession): string {
    const payload: GuestAccessTokenPayload = {
      sessionId: session.id,
      restaurantId: session.restaurantId,
      tableId: session.tableId,
      type: 'guest',
    };

    const secret =
      this.configService.get<string>('GUEST_JWT_SECRET') ||
      this.configService.get<string>('JWT_SECRET') ||
      'guestFallbackSecret';

    return this.jwtService.sign(payload, {
      secret,
      expiresIn: this.ACCESS_TOKEN_EXPIRY,
    });
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken(sessionId: string): Promise<string | null> {
    const session = await this.getSession(sessionId);

    if (!session || session.status !== GuestSessionStatus.ACTIVE) {
      return null;
    }

    // Update last activity
    session.lastActivityAt = new Date();
    await this.saveSession(session);

    return this.generateAccessToken(session);
  }

  /**
   * Revoke a session
   */
  async revokeSession(
    sessionId: string,
    reason:
      | 'user_logout'
      | 'table_reset'
      | 'staff_action'
      | 'expired'
      | 'table_changed',
  ): Promise<void> {
    const session = await this.getSession(sessionId);

    if (!session) {
      return;
    }

    session.status = GuestSessionStatus.REVOKED;
    await this.saveSession(session);

    // Remove from table's session set
    await this.redis.srem(`table:${session.tableId}:sessions`, sessionId);

    // Store revoke reason for audit
    await this.redis.setex(
      `guestSession:${sessionId}:revokeReason`,
      3600,
      reason,
    );
  }

  /**
   * Close session (client initiated)
   */
  async closeSession(sessionId: string): Promise<void> {
    await this.revokeSession(sessionId, 'user_logout');
  }

  /**
   * Heartbeat to keep session alive
   */
  async heartbeat(sessionId: string): Promise<boolean> {
    const session = await this.getSession(sessionId);

    if (!session || session.status !== GuestSessionStatus.ACTIVE) {
      return false;
    }

    session.lastActivityAt = new Date();
    await this.saveSession(session);

    return true;
  }

  /**
   * Get all active sessions for a table
   */
  async getTableSessions(tableId: string): Promise<string[]> {
    return this.redis.smembers(`table:${tableId}:sessions`);
  }

  /**
   * Revoke all sessions for a table
   */
  async revokeTableSessions(
    tableId: string,
    reason: 'table_reset' | 'staff_action' | 'table_changed',
  ): Promise<number> {
    const sessionIds = await this.getTableSessions(tableId);

    for (const sessionId of sessionIds) {
      await this.revokeSession(sessionId, reason);
    }

    return sessionIds.length;
  }

  /**
   * Generate QR token for a table (for admin use)
   */
  async generateQrToken(
    tableId: string,
    restaurantId: string,
  ): Promise<string> {
    // Get or create qr_version for table
    const table = await this.tableRepository.findOne({
      where: { id: tableId },
      select: ['id', 'qrVersion'],
    });

    if (!table) {
      throw new BadRequestException('Table not found');
    }

    // Initialize qr_version if not set
    if (table.qrVersion === undefined || table.qrVersion === null) {
      table.qrVersion = 1;
      await this.tableRepository.save(table);
    }

    const payload: QrTokenPayload = {
      restaurantId,
      tableId,
      qrVersion: table.qrVersion,
      issuedAt: Date.now(),
    };

    const secret = this.configService.get<string>('QR_TOKEN_SECRET');

    return this.jwtService.sign(payload, { secret });
  }

  /**
   * Rotate QR code for a table (invalidates old QR codes)
   */
  async rotateQrCode(tableId: string): Promise<string> {
    const table = await this.tableRepository.findOne({
      where: { id: tableId },
    });

    if (!table) {
      throw new BadRequestException('Table not found');
    }

    // Increment version
    table.qrVersion = (table.qrVersion || 0) + 1;
    await this.tableRepository.save(table);

    // Revoke all existing sessions for this table
    await this.revokeTableSessions(tableId, 'table_changed');

    // Generate new token
    return this.generateQrToken(tableId, table.restaurant_id);
  }
}
