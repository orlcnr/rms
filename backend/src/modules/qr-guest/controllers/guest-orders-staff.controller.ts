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
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { GuestOrdersService } from '../services/guest-orders.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { Role } from '../../../common/enums/role.enum';
import {
  ApproveGuestOrderDto,
  RejectGuestOrderDto,
  UuidParamDto,
  RestaurantIdParamDto,
} from '../dto';
import { GetUser } from '../../../common/decorators/get-user.decorator';
import { GuestGateway } from '../gateways/guest.gateway';

@ApiTags('Guest Orders Management')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('orders/guest-approvals')
export class GuestOrdersStaffController {
  constructor(
    private guestOrdersService: GuestOrdersService,
    private guestGateway: GuestGateway,
  ) {}

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
    const result = await this.guestOrdersService.approveOrder(
      params.id,
      dto,
      user.id,
    );

    this.guestGateway.notifyOrderStatusChange(result.guestOrder.sessionId, {
      orderId: result.guestOrder.id,
      status: result.guestOrder.status,
      timestamp: new Date(),
    });
    this.guestGateway.notifyGuest(
      result.guestOrder.sessionId,
      'guest:order:approved',
      {
        guestOrderId: result.guestOrder.id,
        orderId: result.order.id,
        status: result.guestOrder.status,
        message: 'Siparişiniz onaylandı ve hazırlanmaya alındı.',
        timestamp: new Date(),
      },
    );
    this.guestGateway.notifyOrderConverted(result.guestOrder.restaurantId, {
      guestOrderId: result.guestOrder.id,
      orderId: result.order.id,
      tableId: result.guestOrder.tableId,
      timestamp: new Date(),
    });
    this.guestGateway.notifyTableRefresh(result.guestOrder.tableId, {
      reason: 'converted',
      guestOrderId: result.guestOrder.id,
      timestamp: new Date(),
    });

    return result;
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
    const order = await this.guestOrdersService.rejectOrder(
      params.id,
      dto,
      user.id,
    );

    this.guestGateway.notifyOrderStatusChange(order.sessionId, {
      orderId: order.id,
      status: order.status,
      timestamp: new Date(),
    });
    this.guestGateway.notifyGuest(order.sessionId, 'guest:order:rejected', {
      orderId: order.id,
      status: order.status,
      rejectedReason: order.rejectedReason,
      message: 'Siparişiniz reddedildi.',
      timestamp: new Date(),
    });
    this.guestGateway.notifyTableRefresh(order.tableId, {
      reason: 'rejected',
      guestOrderId: order.id,
      timestamp: new Date(),
    });

    return order;
  }
}
