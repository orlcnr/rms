import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { GetUser } from '../../common/decorators/get-user.decorator';
import { User } from '../users/entities/user.entity';
import { DashboardService } from './dashboard.service';
import { DashboardKpiDto } from './dto/dashboard-kpi.dto';
import { RevenueTrendDto } from './dto/revenue-trend.dto';
import { DailyOperationsDto } from './dto/daily-operations.dto';

@ApiTags('Dashboard')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('kpi')
  @Roles(Role.RESTAURANT_OWNER, Role.MANAGER, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get dashboard KPI metrics' })
  @ApiResponse({ status: 200, type: DashboardKpiDto })
  getKpi(@GetUser() user: User): Promise<DashboardKpiDto> {
    return this.dashboardService.getKpi(user.restaurant_id);
  }

  @Get('revenue-trend')
  @Roles(Role.RESTAURANT_OWNER, Role.MANAGER, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get dashboard revenue trend by day' })
  @ApiQuery({ name: 'days', required: false, type: Number, example: 7 })
  @ApiResponse({ status: 200, type: [RevenueTrendDto] })
  getRevenueTrend(
    @GetUser() user: User,
    @Query('days') days?: string,
  ): Promise<RevenueTrendDto[]> {
    const parsedDays = Number(days || 7);
    return this.dashboardService.getRevenueTrend(
      user.restaurant_id,
      parsedDays,
    );
  }

  @Get('daily-operations')
  @Roles(Role.RESTAURANT_OWNER, Role.MANAGER, Role.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Get daily operations metrics and 30-minute sales buckets',
  })
  @ApiQuery({
    name: 'date',
    required: false,
    type: String,
    example: '2026-03-01',
  })
  @ApiQuery({
    name: 'bucketMinutes',
    required: false,
    type: Number,
    example: 30,
  })
  @ApiResponse({ status: 200, type: DailyOperationsDto })
  getDailyOperations(
    @GetUser() user: User,
    @Query('date') date?: string,
    @Query('bucketMinutes') bucketMinutes?: string,
  ): Promise<DailyOperationsDto> {
    const parsedBucket = Number(bucketMinutes || 30);
    return this.dashboardService.getDailyOperations(
      user.restaurant_id,
      date,
      parsedBucket,
    );
  }
}
