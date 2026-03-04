import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { GuestSessionsService } from '../services/guest-sessions.service';
import { GuestGateway } from '../gateways/guest.gateway';

interface TableStatusChangedEvent {
  tableId: string;
  restaurantId: string;
  oldStatus: string;
  newStatus: string;
}

interface TableResetEvent {
  tableId: string;
  restaurantId: string;
  reason: string;
}

interface PaymentCompletedEvent {
  tableId?: string;
  restaurantId: string;
  orderId: string;
  amount: number;
  userId?: string;
}

@Injectable()
export class TableEventsListener {
  private readonly logger = new Logger(TableEventsListener.name);

  constructor(
    private guestSessionsService: GuestSessionsService,
    private guestGateway: GuestGateway,
  ) {}

  /**
   * Handle table status changes
   * When table becomes OUT_OF_SERVICE, revoke all sessions
   */
  @OnEvent('table.status.changed')
  async handleTableStatusChanged(
    event: TableStatusChangedEvent,
  ): Promise<void> {
    this.logger.log(
      `Table ${event.tableId} status changed from ${event.oldStatus} to ${event.newStatus}`,
    );

    if (event.newStatus === 'out_of_service') {
      await this.revokeTableSessions(
        event.tableId,
        event.restaurantId,
        'Table is out of service',
      );
    } else if (event.newStatus === 'available') {
      const hasRecentPaymentClose =
        await this.guestSessionsService.hasRecentPaymentClose(event.tableId);

      if (hasRecentPaymentClose) {
        this.logger.debug(
          `Skipping fallback revoke for table ${event.tableId}; payment completion already handled it recently.`,
        );
        return;
      }

      this.logger.warn(
        `Table ${event.tableId} became available. Applying fallback guest session revoke.`,
      );
      await this.revokeTableSessions(
        event.tableId,
        event.restaurantId,
        'Table is now available - session ended',
      );
    }
  }

  /**
   * Handle table reset
   * Revoke all sessions when table is reset
   */
  @OnEvent('table.reset')
  async handleTableReset(event: TableResetEvent): Promise<void> {
    this.logger.log(`Table ${event.tableId} reset: ${event.reason}`);

    await this.revokeTableSessions(
      event.tableId,
      event.restaurantId,
      'Table has been reset',
    );
  }

  /**
   * Handle payment completion
   * Optionally revoke sessions when bill is paid
   */
  @OnEvent('payment.completed')
  async handlePaymentCompleted(event: PaymentCompletedEvent): Promise<void> {
    if (!event.tableId) {
      return;
    }

    const tableId = event.tableId;
    const restaurantId = event.restaurantId;

    this.logger.log(
      `Payment completed for table ${tableId}, order ${event.orderId}`,
    );

    await this.guestSessionsService.markRecentPaymentClose(tableId);

    // Get all sessions for this table
    const sessionIds =
      await this.guestSessionsService.getTableSessions(tableId);

    // Notify all guests that bill is paid
    for (const sessionId of sessionIds) {
      this.guestGateway.notifyGuestBillStatus(sessionId, {
        status: 'paid',
        message: 'Payment completed. Thank you for dining with us!',
        timestamp: new Date(),
      });
    }

    await this.revokeTableSessions(
      tableId,
      restaurantId,
      'Payment completed - session ended',
      'payment_completed',
    );
  }

  /**
   * Handle table reassignment (table moved to different area)
   */
  @OnEvent('table.reassigned')
  async handleTableReassigned(event: {
    tableId: string;
    restaurantId: string;
    oldAreaId: string;
    newAreaId: string;
  }): Promise<void> {
    this.logger.log(
      `Table ${event.tableId} reassigned from area ${event.oldAreaId} to ${event.newAreaId}`,
    );

    // Revoke sessions as the table context has changed
    await this.revokeTableSessions(
      event.tableId,
      event.restaurantId,
      'Table has been reassigned',
    );
  }

  /**
   * Helper method to revoke all sessions for a table
   */
  private async revokeTableSessions(
    tableId: string,
    restaurantId: string,
    reason: string,
    revokeReason:
      | 'table_reset'
      | 'staff_action'
      | 'table_changed'
      | 'payment_completed' = 'table_reset',
  ): Promise<void> {
    const sessionIds =
      await this.guestSessionsService.getTableSessions(tableId);

    if (sessionIds.length === 0) {
      return;
    }

    this.logger.log(
      `Revoking ${sessionIds.length} sessions for table ${tableId}`,
    );

    for (const sessionId of sessionIds) {
      // Revoke session
      await this.guestSessionsService.revokeSession(sessionId, revokeReason);

      // Disconnect socket
      await this.guestGateway.revokeSession(sessionId, reason);

      // Notify staff
      this.guestGateway.notifySessionClosed(restaurantId, sessionId, tableId);
    }
  }
}
