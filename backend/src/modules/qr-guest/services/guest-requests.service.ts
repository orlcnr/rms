import { Injectable } from '@nestjs/common';
import { GuestSession } from '../interfaces';
import { WaiterCallDto, BillRequestDto } from '../dto';
import { GuestGateway } from '../gateways/guest.gateway';
import { NotificationsService } from '../../notifications/notifications.service';
import { NotificationType } from '../../notifications/entities/notification.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Table } from '../../tables/entities/table.entity';
import { Repository } from 'typeorm';

export interface WaiterCallRequest {
  sessionId: string;
  restaurantId: string;
  tableId: string;
  reason?: string;
  urgency: 'low' | 'medium' | 'high';
  timestamp: Date;
}

export interface BillRequest {
  sessionId: string;
  restaurantId: string;
  tableId: string;
  paymentMethod?: 'cash' | 'card' | 'split';
  notes?: string;
  timestamp: Date;
}

@Injectable()
export class GuestRequestsService {
  constructor(
    private guestGateway: GuestGateway,
    private notificationsService: NotificationsService,
    @InjectRepository(Table)
    private tableRepository: Repository<Table>,
  ) { }

  /**
   * Handle waiter call request from guest
   */
  async callWaiter(
    session: GuestSession,
    dto: WaiterCallDto,
  ): Promise<WaiterCallRequest> {
    const request: WaiterCallRequest = {
      sessionId: session.id,
      restaurantId: session.restaurantId,
      tableId: session.tableId,
      reason: dto.reason,
      urgency: dto.urgency || 'medium',
      timestamp: new Date(),
    };

    // Emit to staff via ephemeral gateway
    this.guestGateway.notifyWaiterCall(request);

    // Create persistent notification for staff
    const table = await this.tableRepository.findOne({ where: { id: session.tableId } });
    await this.notificationsService.create({
      restaurantId: session.restaurantId,
      title: 'Garson Çağrısı',
      message: `${table?.name || 'Masa'} garson çağırıyor.${dto.reason ? ` Sebep: ${dto.reason}` : ''}`,
      type: NotificationType.WAITER_CALL,
      data: {
        tableId: session.tableId,
        tableName: table?.name,
        urgency: request.urgency,
      },
    });

    return request;
  }

  /**
   * Handle bill request from guest
   */
  async requestBill(
    session: GuestSession,
    dto: BillRequestDto,
  ): Promise<BillRequest> {
    const request: BillRequest = {
      sessionId: session.id,
      restaurantId: session.restaurantId,
      tableId: session.tableId,
      paymentMethod: dto.paymentMethod,
      notes: dto.notes,
      timestamp: new Date(),
    };

    // Emit to staff via ephemeral gateway
    this.guestGateway.notifyBillRequest(request);

    // Create persistent notification for staff
    const table = await this.tableRepository.findOne({ where: { id: session.tableId } });
    await this.notificationsService.create({
      restaurantId: session.restaurantId,
      title: 'Hesap İsteği',
      message: `${table?.name || 'Masa'} hesap istiyor.${dto.paymentMethod ? ` Ödeme: ${dto.paymentMethod}` : ''}`,
      type: NotificationType.BILL_REQUEST,
      data: {
        tableId: session.tableId,
        tableName: table?.name,
        paymentMethod: dto.paymentMethod,
      },
    });

    // Notify guest that request was received
    this.guestGateway.notifyGuestBillStatus(session.id, {
      status: 'requested',
      timestamp: request.timestamp,
    });

    return request;
  }

  /**
   * Mark bill as paid (called by payment service)
   */
  async markBillAsPaid(sessionId: string): Promise<void> {
    this.guestGateway.notifyGuestBillStatus(sessionId, {
      status: 'paid',
      timestamp: new Date(),
    });
  }

  /**
   * Confirm waiter is coming (staff action)
   */
  async confirmWaiterComing(
    sessionId: string,
    staffName: string,
  ): Promise<void> {
    this.guestGateway.notifyGuest(sessionId, 'waiter:confirmed', {
      staffName,
      message: 'A waiter is on their way to your table.',
      timestamp: new Date(),
    });
  }

  /**
   * Confirm bill is being processed (staff action)
   */
  async confirmBillProcessing(
    sessionId: string,
    staffName: string,
  ): Promise<void> {
    this.guestGateway.notifyGuestBillStatus(sessionId, {
      status: 'processing',
      staffName,
      message: 'Your bill request is being processed.',
      timestamp: new Date(),
    });
  }
}
