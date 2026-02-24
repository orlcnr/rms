import {
  Controller,
  Post,
  Get,
  Param,
  Query,
  SetMetadata,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { GuestSessionsService } from '../services/guest-sessions.service';
import { GuestOrdersService } from '../services/guest-orders.service';
import { GuestGateway } from '../gateways/guest.gateway';

const IS_PUBLIC_KEY = 'isPublic';
const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

/**
 * DEBUG CONTROLLER - Only for development/testing
 * These endpoints help simulate various scenarios for testing the QR Guest flow
 */
@ApiTags('Guest Debug (DEV ONLY)')
@ApiBearerAuth()
@Controller('guest/debug')
export class GuestDebugController {
  constructor(
    private guestSessionsService: GuestSessionsService,
    private guestOrdersService: GuestOrdersService,
    private guestGateway: GuestGateway,
  ) { }

  /**
   * Generate a test QR token for a table
   */
  @Get('generate-qr/:tableId')
  @Public()
  @ApiOperation({ summary: 'Generate a test QR token for a table (DEV ONLY)' })
  async generateQrToken(
    @Param('tableId') tableId: string,
    @Query('restaurantId') restaurantId: string,
  ) {
    const token = await this.guestSessionsService.generateQrToken(
      tableId,
      restaurantId || 'test-restaurant-id',
    );

    // Generate a full URL that can be used for testing
    const frontendUrl = process.env.FRONTEND_URL;
    if (!frontendUrl) {
      throw new Error('FRONTEND_URL environment variable is not configured');
    }

    return {
      token,
      qrUrl: `${frontendUrl}/guest?token=${encodeURIComponent(token)}`,
      tableId,
      restaurantId: restaurantId || 'test-restaurant-id',
    };
  }

  /**
   * Revoke all sessions for a table (simulates table reset)
   */
  @Post('revoke-table-sessions/:tableId')
  @Public()
  @ApiOperation({ summary: 'Revoke all sessions for a table (DEV ONLY)' })
  async revokeTableSessions(@Param('tableId') tableId: string) {
    const count = await this.guestSessionsService.revokeTableSessions(
      tableId,
      'staff_action',
    );

    return {
      message: `Revoked ${count} sessions for table ${tableId}`,
      revokedCount: count,
    };
  }

  /**
   * Simulate a waiter call notification
   */
  @Post('simulate-waiter-call/:sessionId')
  @Public()
  @ApiOperation({ summary: 'Simulate waiter call notification (DEV ONLY)' })
  async simulateWaiterCall(
    @Param('sessionId') sessionId: string,
    @Query('restaurantId') restaurantId: string,
  ) {
    this.guestGateway.notifyWaiterCall({
      sessionId,
      restaurantId: restaurantId || 'test-restaurant',
      tableId: 'test-table',
      reason: 'Test waiter call',
      urgency: 'medium',
      timestamp: new Date(),
    });

    return { message: 'Waiter call notification sent' };
  }

  /**
   * Simulate order status change
   */
  @Post('simulate-order-status/:sessionId')
  @Public()
  @ApiOperation({ summary: 'Simulate order status change (DEV ONLY)' })
  async simulateOrderStatus(
    @Param('sessionId') sessionId: string,
    @Query('orderId') orderId: string,
    @Query('status') status: string,
  ) {
    this.guestGateway.notifyOrderStatusChange(sessionId, {
      orderId: orderId || 'test-order-id',
      status: status || 'approved',
      timestamp: new Date(),
    });

    return { message: `Order status changed to ${status}` };
  }

  /**
   * Simulate bill status update
   */
  @Post('simulate-bill-status/:sessionId')
  @Public()
  @ApiOperation({ summary: 'Simulate bill status update (DEV ONLY)' })
  async simulateBillStatus(
    @Param('sessionId') sessionId: string,
    @Query('status') status: 'requested' | 'processing' | 'paid',
  ) {
    this.guestGateway.notifyGuestBillStatus(sessionId, {
      status: status || 'paid',
      message: 'Test bill status update',
      timestamp: new Date(),
    });

    return { message: `Bill status updated to ${status}` };
  }

  /**
   * Simulate session revocation
   */
  @Post('simulate-session-revoke/:sessionId')
  @Public()
  @ApiOperation({ summary: 'Simulate session revocation (DEV ONLY)' })
  async simulateSessionRevoke(@Param('sessionId') sessionId: string) {
    await this.guestGateway.revokeSession(sessionId, 'Test session revocation');

    return { message: 'Session revoked' };
  }

  /**
   * Get all active sessions for a table
   */
  @Get('table-sessions/:tableId')
  @ApiOperation({ summary: 'Get all active sessions for a table (DEV ONLY)' })
  async getTableSessions(@Param('tableId') tableId: string) {
    const sessionIds =
      await this.guestSessionsService.getTableSessions(tableId);

    return {
      tableId,
      sessionCount: sessionIds.length,
      sessionIds,
    };
  }
}
