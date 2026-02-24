import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
} from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { AnalyticsSummaryDto, HourlySalesDto } from './dto/analytics-summary.dto';

@ApiTags('Analytics')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) { }

  @Roles(Role.RESTAURANT_OWNER, Role.MANAGER, Role.SUPER_ADMIN)
  @Get('summary')
  @ApiOperation({
    summary: 'Get analytics summary',
    description: 'Restaurant için özet analytics verilerini getirir',
  })
  @ApiResponse({
    status: 200,
    description: 'Analytics özeti başarıyla döndürüldü',
    type: AnalyticsSummaryDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Token geçersiz veya süresi dolmuş',
  })
  @ApiForbiddenResponse({
    description: 'Bu işlem için yetkiniz yok',
  })
  async getSummary(@Request() req): Promise<AnalyticsSummaryDto> {
    return this.analyticsService.getSummary(req.user.restaurantId);
  }

  @Roles(Role.RESTAURANT_OWNER, Role.MANAGER, Role.SUPER_ADMIN)
  @Get('hourly-sales')
  @ApiOperation({
    summary: 'Get hourly sales report',
    description: 'Son 24 saatin saatlik satış raporunu getirir',
  })
  @ApiResponse({
    status: 200,
    description: 'Saatlik satış raporu başarıyla döndürüldü',
    type: [HourlySalesDto],
  })
  @ApiUnauthorizedResponse({
    description: 'Token geçersiz veya süresi dolmuş',
  })
  @ApiForbiddenResponse({
    description: 'Bu işlem için yetkiniz yok',
  })
  async getHourlySales(@Request() req): Promise<HourlySalesDto[]> {
    return this.analyticsService.getHourlySales(req.user.restaurantId);
  }
}
