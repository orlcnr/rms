import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuditSearchService } from './audit-search.service';
import { GetAuditLogsDto } from './dto/get-audit-logs.dto';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { GetUser } from '../../common/decorators/get-user.decorator';

@ApiTags('Audit Logs')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller('audit')
export class AuditController {
  constructor(private readonly auditSearchService: AuditSearchService) {}

  @Roles(Role.RESTAURANT_OWNER, Role.SUPER_ADMIN, Role.MANAGER)
  @Get()
  @ApiOperation({ summary: 'Get filtered audit logs' })
  async findAll(@Query() query: GetAuditLogsDto, @GetUser() user: any) {
    // Eğer SUPER_ADMIN değilse sadece kendi restoranının loglarını görebilir
    if (user.role !== Role.SUPER_ADMIN) {
      query.restaurant_id = user.restaurant_id;
    }
    return this.auditSearchService.findAll(query);
  }
}
