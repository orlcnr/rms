import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { GuestRequestsService } from '../services/guest-requests.service';
import { GuestAuthGuard } from '../guards/guest-auth.guard';
import { WaiterCallDto, BillRequestDto } from '../dto';
import type { Request } from 'express';

@ApiTags('Guest Requests')
@Controller('guest/requests')
export class GuestRequestsController {
  constructor(private guestRequestsService: GuestRequestsService) {}

  @UseGuards(GuestAuthGuard)
  @Post('waiter')
  @Throttle({ default: { limit: 3, ttl: 60000 } }) // 3 calls per minute
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Call waiter to table' })
  async callWaiter(@Body() dto: WaiterCallDto, @Req() req: Request) {
    return await this.guestRequestsService.callWaiter(req.guestSession!, dto);
  }

  @UseGuards(GuestAuthGuard)
  @Post('bill')
  @Throttle({ default: { limit: 2, ttl: 60000 } }) // 2 requests per minute
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Request bill/check' })
  async requestBill(@Body() dto: BillRequestDto, @Req() req: Request) {
    return await this.guestRequestsService.requestBill(req.guestSession!, dto);
  }
}
