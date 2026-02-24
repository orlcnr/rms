export interface GuestSession {
  id: string;
  restaurantId: string;
  tableId: string;
  tableName?: string;
  googleCommentUrl?: string;
  deviceFingerprintHash?: string;
  status: GuestSessionStatus;
  createdAt: Date;
  expiresAt: Date;
  lastActivityAt: Date;
}

export enum GuestSessionStatus {
  ACTIVE = 'active',
  REVOKED = 'revoked',
  EXPIRED = 'expired',
}

export interface QrTokenPayload {
  restaurantId: string;
  tableId: string;
  qrVersion: number;
  issuedAt: number;
}

export interface GuestAccessTokenPayload {
  sessionId: string;
  restaurantId: string;
  tableId: string;
  type: 'guest';
}

export interface DeviceInfo {
  userAgent?: string;
  screenResolution?: string;
  timezone?: string;
  language?: string;
  platform?: string;
}
