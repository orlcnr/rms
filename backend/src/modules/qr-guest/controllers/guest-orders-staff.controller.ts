import {
    Controller,
    Get,
    Post,
    Body,
    Param,
    UseGuards,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiBearerAuth,
} from '@nestjs/swagger';
import { GuestOrdersService } from '../services/guest-orders.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { Role } from '../../../common/enums/role.enum';
import { ApproveGuestOrderDto, RejectGuestOrderDto, UuidParamDto, RestaurantIdParamDto } from '../dto';
import { GetUser } from '../../../common/decorators/get-user.decorator';

@ApiTags('Guest Orders Management')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('orders/guest-approvals')
export class GuestOrdersStaffController {
    constructor(private guestOrdersService: GuestOrdersService) { }

    @Roles(Role.RESTAURANT_OWNER, Role.MANAGER, Role.WAITER)
    @Get('restaurant/:restaurantId/pending')
    @ApiOperation({
        summary: 'Get pending guest orders for restaurant (staff only)',
    })
    async getPendingOrders(@Param() params: RestaurantIdParamDto) {
        return await this.guestOrdersService.getPendingOrdersForRestaurant(
            params.restaurantId,
        );
    }

    @Roles(Role.RESTAURANT_OWNER, Role.MANAGER, Role.WAITER)
    @Post(':id/approve')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Approve guest order and convert to real order (staff only)',
    })
    async approveOrder(
        @Param() params: UuidParamDto,
        @Body() dto: ApproveGuestOrderDto,
        @GetUser() user: { id: string },
    ) {
        return await this.guestOrdersService.approveOrder(params.id, dto, user.id);
    }

    @Roles(Role.RESTAURANT_OWNER, Role.MANAGER, Role.WAITER)
    @Post(':id/reject')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Reject guest order (staff only)' })
    async rejectOrder(
        @Param() params: UuidParamDto,
        @Body() dto: RejectGuestOrderDto,
        @GetUser() user: { id: string },
    ) {
        return await this.guestOrdersService.rejectOrder(params.id, dto, user.id);
    }
}
