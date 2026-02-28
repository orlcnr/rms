import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { SettingsService } from './settings.service';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { GetUser } from '../../common/decorators/get-user.decorator';
import { User } from '../../modules/users/entities/user.entity';
import { Role } from '../../common/enums/role.enum';
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
    // Multi-tenant control + SUPER_ADMIN exception
    if (user.role !== Role.SUPER_ADMIN && user.restaurant_id !== restaurantId) {
      throw new ForbiddenException('Bu restorana erişim yetkiniz yok');
    }

    return this.settingsService.getSettingsByGroup(
      restaurantId,
      query.group || 'payment',
    );
  }

  @Get(':restaurantId/:key')
  @ApiOperation({ summary: 'Get a specific setting' })
  async getSetting(
    @Param('restaurantId') restaurantId: string,
    @Param('key') key: string,
    @GetUser() user: User,
  ) {
    // Multi-tenant control + SUPER_ADMIN exception
    if (user.role !== Role.SUPER_ADMIN && user.restaurant_id !== restaurantId) {
      throw new ForbiddenException('Bu restorana erişim yetkiniz yok');
    }

    const value = await this.settingsService.getSetting(restaurantId, key);
    return { key, value };
  }

  @Post(':restaurantId')
  @ApiOperation({ summary: 'Update or create a setting' })
  async updateSetting(
    @Param('restaurantId') restaurantId: string,
    @Body() dto: UpdateSettingDto,
    @GetUser() user: User,
  ) {
    // Multi-tenant control + SUPER_ADMIN exception
    if (user.role !== Role.SUPER_ADMIN && user.restaurant_id !== restaurantId) {
      throw new ForbiddenException('Bu restorana erişim yetkiniz yok');
    }

    return this.settingsService.updateSetting(
      restaurantId,
      dto.key,
      dto.value,
      dto.type,
      dto.group,
    );
  }
}
