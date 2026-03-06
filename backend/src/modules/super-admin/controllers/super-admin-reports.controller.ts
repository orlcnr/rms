import {
  Controller,
  Get,
  Query,
  Req,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { AuditInterceptor } from '../../../common/interceptors/audit.interceptor';
import { SuperAdminGuard } from '../../../common/guards/super-admin.guard';
import { SuperAdminJwtAuthGuard } from '../../super-admin-auth/guards/super-admin-jwt-auth.guard';
import { SuperAdminReportsService } from '../services/super-admin-reports.service';
import { GetSuperAdminTenantActivityDto } from '../dto/get-super-admin-tenant-activity.dto';
import { AuditSearchService } from '../../audit/audit-search.service';
import { GetAuditLogsDto } from '../../audit/dto/get-audit-logs.dto';
import { AuditService } from '../../audit/audit.service';

@ApiTags('Super Admin Reports')
@ApiBearerAuth()
@Controller('super-admin')
@UseGuards(SuperAdminJwtAuthGuard, SuperAdminGuard)
@UseInterceptors(AuditInterceptor)
export class SuperAdminReportsController {
  constructor(
    private readonly superAdminReportsService: SuperAdminReportsService,
    private readonly auditSearchService: AuditSearchService,
    private readonly auditService: AuditService,
  ) {}

  @Get('reports/tenants-overview')
  @ApiOperation({ summary: 'Get paginated tenant overview for super admins' })
  getTenantsOverview(
    @Query()
    query: {
      page?: number;
      limit?: number;
      search?: string;
      is_active?: boolean;
    },
  ) {
    return this.superAdminReportsService.getTenantsOverview(query);
  }

  @Get('reports/tenant-activity')
  @ApiOperation({
    summary: 'Get cross-tenant activity summary for super admins',
  })
  getTenantActivity(@Query() query: GetSuperAdminTenantActivityDto) {
    return this.superAdminReportsService.getTenantActivity(query);
  }

  @Get('audit/logs')
  @ApiOperation({ summary: 'Get cross-tenant audit logs for super admins' })
  async getAuditLogs(@Query() query: GetAuditLogsDto, @Req() request: Request) {
    const result = await this.auditSearchService.findAll(query);
    const user = request.user as { id: string } | undefined;

    await this.auditService.emitLog({
      action: 'SUPER_ADMIN_AUDIT_LOGS_ACCESSED',
      resource: 'audit',
      user_id: user?.id,
      payload: {
        restaurant_id: query.restaurant_id,
        action: query.action,
        start_date: query.start_date,
        end_date: query.end_date,
        result_count: result.meta.itemCount,
        path: request.path,
        ip: request.ip,
      },
    });

    return result;
  }
}
