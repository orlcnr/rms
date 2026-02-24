import {
    Controller,
    Get,
    Patch,
    Param,
    UseGuards,
    Request,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('notifications')
export class NotificationsController {
    constructor(private readonly notificationsService: NotificationsService) { }

    @Get()
    async findAll(@Request() req) {
        return this.notificationsService.findAll(req.user);
    }

    @Get('unread-count')
    async getUnreadCount(@Request() req) {
        return { count: await this.notificationsService.getUnreadCount(req.user) };
    }

    @Patch(':id/read')
    async markAsRead(@Param('id') id: string, @Request() req) {
        return this.notificationsService.markAsRead(id, req.user);
    }

    @Patch('read-all')
    async markAllAsRead(@Request() req) {
        await this.notificationsService.markAllAsRead(req.user);
        return { success: true };
    }
}
