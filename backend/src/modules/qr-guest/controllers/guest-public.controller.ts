import {
  Controller,
  Get,
  Patch,
  Req,
  UseGuards,
  Param,
  Body,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { GuestAuthGuard } from '../guards/guest-auth.guard';
import { GuestOrdersService } from '../services/guest-orders.service';
import { GuestRequestsService } from '../services/guest-requests.service';
import { GuestSessionsService } from '../services/guest-sessions.service';
import { UpdateSessionProfileDto, UuidParamDto } from '../dto';

@ApiTags('Guest Public')
@Controller('guest')
export class GuestPublicController {
  constructor(
    private readonly guestOrdersService: GuestOrdersService,
    private readonly guestRequestsService: GuestRequestsService,
    private readonly guestSessionsService: GuestSessionsService,
  ) {}

  @UseGuards(GuestAuthGuard)
  @Get('bootstrap')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get guest bootstrap payload' })
  async getBootstrap(@Req() req: Request) {
    const session = req.guestSession!;
    const [
      catalog,
      activeDraftOrder,
      sessionOrders,
      tableOrderedMenuItemIds,
      tableGuestOrderSummary,
      tableBill,
      requestState,
    ] = await Promise.all([
      this.guestOrdersService.getCatalog(session),
      this.guestOrdersService.getActiveDraftOrder(session),
      this.guestOrdersService.getVisibleOrdersForGuest(session),
      this.guestOrdersService.getTableOrderedMenuItemIds(session),
      this.guestOrdersService.getTableGuestOrderSummary(session),
      this.guestOrdersService.getTableBill(session),
      this.guestRequestsService.getRequestState(session.id),
    ]);

    const serverTime = new Date().toISOString();

    return {
      serverTime,
      session,
      restaurant: {
        id: session.restaurantId,
        name: session.restaurantName || 'Restoran',
        googleCommentUrl: session.googleCommentUrl,
      },
      table: {
        id: session.tableId,
        name: session.tableName || 'Masa',
      },
      displayName: session.displayName || null,
      catalog,
      activeDraftOrder,
      sessionOrders,
      tableOrderedMenuItemIds,
      tableGuestOrderSummary,
      tableBill,
      requestState,
    };
  }

  @UseGuards(GuestAuthGuard)
  @Get('catalog')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get guest menu catalog' })
  async getCatalog(@Req() req: Request) {
    return {
      serverTime: new Date().toISOString(),
      catalog: await this.guestOrdersService.getCatalog(req.guestSession!),
    };
  }

  @UseGuards(GuestAuthGuard)
  @Patch('sessions/:id/profile')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update guest session profile' })
  async updateProfile(
    @Param() params: UuidParamDto,
    @Body() dto: UpdateSessionProfileDto,
  ) {
    return {
      serverTime: new Date().toISOString(),
      session: await this.guestSessionsService.updateProfile(params.id, dto),
    };
  }
}
