import { Controller, Get, Patch, Param, Query } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { GetUser } from '../../common/decorators/get-user.decorator';
import { User } from '../users/entities/user.entity';
import { GetNotificationsDto } from './dto/get-notifications.dto';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  async findAll(@Query() query: GetNotificationsDto, @GetUser() user: User) {
    return this.notificationsService.findAll(user, query);
  }

  @Get('unread-count')
  async getUnreadCount(@GetUser() user: User) {
    return { count: await this.notificationsService.getUnreadCount(user) };
  }

  @Patch(':id/read')
  async markAsRead(@Param('id') id: string, @GetUser() user: User) {
    return this.notificationsService.markAsRead(id, user);
  }

  @Patch('read-all')
  async markAllAsRead(@GetUser() user: User) {
    await this.notificationsService.markAllAsRead(user);
    return { success: true };
  }
}
