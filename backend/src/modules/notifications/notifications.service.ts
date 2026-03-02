import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification, NotificationType } from './entities/notification.entity';
import { NotificationsGateway } from './notifications.gateway';
import { GetNotificationsDto } from './dto/get-notifications.dto';

export interface PaginationMeta {
  totalItems: number;
  itemCount: number;
  itemsPerPage: number;
  totalPages: number;
  currentPage: number;
}

export interface PaginatedNotifications {
  items: Notification[];
  meta: PaginationMeta;
}

export interface CreateNotificationDto {
  restaurantId: string;
  userId?: string;
  title: string;
  message: string;
  type: NotificationType;
  data?: Record<string, any>;
}

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    private readonly notificationsGateway: NotificationsGateway,
  ) {}

  async create(dto: CreateNotificationDto): Promise<Notification> {
    const notification = this.notificationRepository.create({
      ...dto,
      isRead: false,
    });

    const savedNotification =
      await this.notificationRepository.save(notification);

    // Emit via WebSocket for real-time update
    this.notificationsGateway.server
      .to(dto.restaurantId)
      .emit('new_notification', savedNotification);

    return savedNotification;
  }

  async findAll(
    user: any,
    query: GetNotificationsDto = {},
  ): Promise<PaginatedNotifications> {
    const restaurantId = user.restaurantId || user.restaurant_id;
    if (!restaurantId && user.role !== 'super_admin') {
      return {
        items: [],
        meta: {
          totalItems: 0,
          itemCount: 0,
          itemsPerPage: query.limit || 20,
          totalPages: 0,
          currentPage: query.page || 1,
        },
      };
    }

    const page = query.page || 1;
    const limit = query.limit || 20;

    const qb = this.notificationRepository.createQueryBuilder('notification');

    if (user.role !== 'super_admin') {
      qb.andWhere('notification.restaurantId = :restaurantId', {
        restaurantId,
      });
    }

    if (query.type) {
      qb.andWhere('notification.type = :type', { type: query.type });
    }

    if (query.isRead !== undefined) {
      qb.andWhere('notification.isRead = :isRead', { isRead: query.isRead });
    }

    qb.orderBy('notification.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [items, totalItems] = await qb.getManyAndCount();
    const totalPages = Math.ceil(totalItems / limit);

    return {
      items,
      meta: {
        totalItems,
        itemCount: items.length,
        itemsPerPage: limit,
        totalPages,
        currentPage: page,
      },
    };
  }

  async getUnreadCount(user: any): Promise<number> {
    const restaurantId = user.restaurantId || user.restaurant_id;
    if (!restaurantId && user.role !== 'super_admin') {
      return 0;
    }

    const where: any = { isRead: false };
    if (user.role !== 'super_admin') {
      where.restaurantId = restaurantId;
    }

    return this.notificationRepository.count({ where });
  }

  async markAsRead(id: string, user: any): Promise<Notification> {
    const notification = await this.notificationRepository.findOne({
      where: { id },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    // Security check: ensure notification belongs to user's restaurant
    if (
      user.role !== 'super_admin' &&
      notification.restaurantId !== (user.restaurantId || user.restaurant_id)
    ) {
      throw new NotFoundException('Notification not found');
    }

    notification.isRead = true;
    return this.notificationRepository.save(notification);
  }

  async markAllAsRead(user: any): Promise<void> {
    const restaurantId = user.restaurantId || user.restaurant_id;
    if (!restaurantId && user.role !== 'super_admin') return;

    const where: any = { isRead: false };
    if (user.role !== 'super_admin') {
      where.restaurantId = restaurantId;
    }

    await this.notificationRepository.update(where, { isRead: true });
  }
}
