import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { SettingsService } from './settings.service';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { GetUser } from '../../common/decorators/get-user.decorator';
import { User } from '../../modules/users/entities/user.entity';
import { GetSettingsDto } from './dto/get-settings.dto';
import { UpdateSettingDto } from './dto/update-setting.dto';

@ApiTags('Settings')
@ApiBearerAuth()
@Controller('settings')
@UseGuards(JwtAuthGuard)
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get(':restaurantId')
  @ApiOperation({ summary: 'Get settings for a restaurant' })
  async getSettings(
    @Param('restaurantId') restaurantId: string,
    @Query() query: GetSettingsDto,
    @GetUser() user: User,
  ) {
    this.settingsService.assertRestaurantAccess(user, restaurantId);

    return this.settingsService.getSettingsByGroup(
      restaurantId,
      query.group || 'payment',
      query.includeMeta || false,
    );
  }

  @Get(':restaurantId/:key')
  @ApiOperation({ summary: 'Get a specific setting' })
  async getSetting(
    @Param('restaurantId') restaurantId: string,
    @Param('key') key: string,
    @GetUser() user: User,
  ) {
    this.settingsService.assertRestaurantAccess(user, restaurantId);

    const value = await this.settingsService.getSetting(restaurantId, key);
    return { key, value };
  }

  @Post(':restaurantId')
  @ApiOperation({ summary: 'Update or create a setting' })
  async updateSetting(
    @Param('restaurantId') restaurantId: string,
    @Body() dto: UpdateSettingDto,
    @GetUser() user: User,
    @Req() request: Request,
  ) {
    this.settingsService.assertRestaurantAccess(user, restaurantId);

    return this.settingsService.updateSetting(
      restaurantId,
      dto.key,
      dto.value,
      dto.type,
      dto.group,
      dto.lastKnownUpdatedAt,
      user,
      request,
    );
  }
}
