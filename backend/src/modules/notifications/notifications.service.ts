import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification, NotificationType } from './entities/notification.entity';
import { NotificationsGateway } from './notifications.gateway';

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
    ) { }

    async create(dto: CreateNotificationDto): Promise<Notification> {
        const notification = this.notificationRepository.create({
            ...dto,
            isRead: false,
        });

        const savedNotification = await this.notificationRepository.save(notification);

        // Emit via WebSocket for real-time update
        this.notificationsGateway.server
            .to(dto.restaurantId)
            .emit('new_notification', savedNotification);

        return savedNotification;
    }

    async findAll(user: any): Promise<Notification[]> {
        const restaurantId = user.restaurantId;
        if (!restaurantId && user.role !== 'super_admin') {
            return [];
        }

        const where: any = {};
        if (user.role !== 'super_admin') {
            where.restaurantId = restaurantId;
        }

        return this.notificationRepository.find({
            where,
            order: { created_at: 'DESC' },
            take: 50, // Limit to recent 50
        });
    }

    async getUnreadCount(user: any): Promise<number> {
        const restaurantId = user.restaurantId;
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
        if (user.role !== 'super_admin' && notification.restaurantId !== user.restaurantId) {
            throw new NotFoundException('Notification not found');
        }

        notification.isRead = true;
        return this.notificationRepository.save(notification);
    }

    async markAllAsRead(user: any): Promise<void> {
        const restaurantId = user.restaurantId;
        if (!restaurantId && user.role !== 'super_admin') return;

        const where: any = { isRead: false };
        if (user.role !== 'super_admin') {
            where.restaurantId = restaurantId;
        }

        await this.notificationRepository.update(where, { isRead: true });
    }
}
