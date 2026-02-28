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
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { GuestOrdersService } from '../services/guest-orders.service';
import { GuestAuthGuard } from '../guards/guest-auth.guard';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { Role } from '../../../common/enums/role.enum';
import {
  CreateDraftOrderDto,
  UpdateDraftOrderDto,
  SubmitOrderDto,
  ApproveGuestOrderDto,
  RejectGuestOrderDto,
  UuidParamDto,
} from '../dto';
import type { Request } from 'express';
import { GuestSession } from '../interfaces';
import { GetUser } from '../../../common/decorators/get-user.decorator';

@ApiTags('Guest Orders')
@Controller('guest/orders')
export class GuestOrdersController {
  constructor(private guestOrdersService: GuestOrdersService) {}

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
    return await this.guestOrdersService.submitOrder(
      params.id,
      req.guestSession!,
      dto,
    );
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
