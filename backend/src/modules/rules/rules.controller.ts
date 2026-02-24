import { Body, Controller, Get, Param, Post, UseGuards, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { RulesService } from './rules.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { RuleKey } from './enums/rule-key.enum';

@ApiTags('Business Rules')
@ApiBearerAuth()
@Controller('rules')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RulesController {
    constructor(private readonly rulesService: RulesService) { }

    @Get('restaurant/:restaurantId')
    @Roles(Role.SUPER_ADMIN, Role.RESTAURANT_OWNER, Role.MANAGER)
    async listRules(@Param('restaurantId') restaurantId: string) {
        return this.rulesService.listRules(restaurantId);
    }

    @Post('restaurant/:restaurantId/toggle')
    @Roles(Role.SUPER_ADMIN, Role.RESTAURANT_OWNER)
    async toggleRule(
        @Param('restaurantId') restaurantId: string,
        @Body() body: { key: RuleKey, is_enabled: boolean }
    ) {
        return this.rulesService.toggleRule(restaurantId, body.key, body.is_enabled);
    }

    @Post('restaurant/:restaurantId/initialize')
    @Roles(Role.SUPER_ADMIN)
    @ApiOperation({ summary: 'Initialize default rules for a restaurant' })
    async initializeRules(@Param('restaurantId') restaurantId: string) {
        await this.rulesService.initializeDefaultRules(restaurantId);
        return { message: 'Default rules initialized' };
    }
}
