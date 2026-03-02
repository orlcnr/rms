import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { NotificationsGateway } from '../../notifications/notifications.gateway';
import { DashboardService } from '../dashboard.service';

interface RestaurantEvent {
  restaurantId: string;
}

interface DashboardOrderChangedEvent extends RestaurantEvent {
  reason?: 'order';
}

interface DashboardPaymentEvent extends RestaurantEvent {
  tableId?: string;
  orderId?: string;
  amount?: number;
}

interface DashboardTableChangedEvent extends RestaurantEvent {
  tableId: string;
  oldStatus: string;
  newStatus: string;
}

@Injectable()
export class DashboardEventsListener {
  constructor(
    private readonly dashboardService: DashboardService,
    private readonly notificationsGateway: NotificationsGateway,
  ) {}

  @OnEvent('order.dashboard.changed')
  async onOrderChanged(event: DashboardOrderChangedEvent): Promise<void> {
    await this.dashboardService.invalidateDailyOpsCache(event.restaurantId);
    this.notificationsGateway.notifyDashboardOpsRefresh(event.restaurantId, {
      reason: 'order',
      at: new Date().toISOString(),
    });
  }

  @OnEvent('payment.completed')
  async onPaymentCompleted(event: DashboardPaymentEvent): Promise<void> {
    await this.dashboardService.invalidateDailyOpsCache(event.restaurantId);
    this.notificationsGateway.notifyDashboardOpsRefresh(event.restaurantId, {
      reason: 'payment',
      at: new Date().toISOString(),
    });
    this.notificationsGateway.notifyPaymentCompleted(event.restaurantId, {
      orderId: event.orderId,
      tableId: event.tableId,
      amount: event.amount,
      at: new Date().toISOString(),
    });
  }

  @OnEvent('table.status.changed')
  async onTableChanged(event: DashboardTableChangedEvent): Promise<void> {
    await this.dashboardService.invalidateDailyOpsCache(event.restaurantId);
    this.notificationsGateway.notifyDashboardOpsRefresh(event.restaurantId, {
      reason: 'table',
      at: new Date().toISOString(),
    });
  }
}
