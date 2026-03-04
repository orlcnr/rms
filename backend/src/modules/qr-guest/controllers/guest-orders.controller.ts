import {
  Controller,
  Post,
  Body,
  Param,
  UseGuards,
  Req,
  Get,
  Put,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { GuestOrdersService } from '../services/guest-orders.service';
import { GuestAuthGuard } from '../guards/guest-auth.guard';
import {
  CreateDraftOrderDto,
  UpdateDraftOrderDto,
  SubmitOrderDto,
  UuidParamDto,
} from '../dto';
import type { Request } from 'express';
import { GuestGateway } from '../gateways/guest.gateway';

@ApiTags('Guest Orders')
@Controller('guest/orders')
export class GuestOrdersController {
  constructor(
    private guestOrdersService: GuestOrdersService,
    private guestGateway: GuestGateway,
  ) {}

  // ===== Guest Endpoints =====

  @UseGuards(GuestAuthGuard)
  @Post()
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 orders per minute
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new draft order' })
  async createDraftOrder(
    @Body() dto: CreateDraftOrderDto,
    @Req() req: Request,
  ) {
    console.log(
      '[DEBUG Controller] createDraftOrder called, session:',
      req.guestSession?.id,
    );
    return await this.guestOrdersService.createDraftOrder(
      req.guestSession!,
      dto,
    );
  }

  @UseGuards(GuestAuthGuard)
  @Put(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a draft order' })
  async updateDraftOrder(
    @Param() params: UuidParamDto,
    @Body() dto: UpdateDraftOrderDto,
    @Req() req: Request,
  ) {
    return await this.guestOrdersService.updateDraftOrder(
      params.id,
      req.guestSession!,
      dto,
    );
  }

  @UseGuards(GuestAuthGuard)
  @Post(':id/submit')
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 submissions per minute
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Submit draft order for approval' })
  async submitOrder(
    @Param() params: UuidParamDto,
    @Body() dto: SubmitOrderDto,
    @Req() req: Request,
  ) {
    const order = await this.guestOrdersService.submitOrder(
      params.id,
      req.guestSession!,
      dto,
    );

    this.guestGateway.notifyOrderSubmitted(req.guestSession!.restaurantId, {
      orderId: order.id,
      tableId: req.guestSession!.tableId,
      sessionId: req.guestSession!.id,
      totalAmount: Number(order.totalAmount),
      timestamp: new Date(),
    });
    this.guestGateway.notifyOrderStatusChange(req.guestSession!.id, {
      orderId: order.id,
      status: order.status,
      timestamp: new Date(),
    });
    this.guestGateway.notifyTableRefresh(req.guestSession!.tableId, {
      reason: 'submitted',
      guestOrderId: order.id,
      timestamp: new Date(),
    });

    return order;
  }

  @UseGuards(GuestAuthGuard)
  @Get('table-bill')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get total bill for the table' })
  async getTableBill(@Req() req: Request) {
    return await this.guestOrdersService.getTableBill(req.guestSession!);
  }

  @UseGuards(GuestAuthGuard)
  @Get(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get order details' })
  async getOrder(@Param() params: UuidParamDto, @Req() req: Request) {
    return await this.guestOrdersService.getOrder(params.id, req.guestSession!);
  }

  @UseGuards(GuestAuthGuard)
  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all orders for current session' })
  async getSessionOrders(@Req() req: Request) {
    return await this.guestOrdersService.getSessionOrders(req.guestSession!);
  }
}
