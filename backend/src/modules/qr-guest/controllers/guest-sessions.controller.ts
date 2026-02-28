import {
  Controller,
  Post,
  Body,
  Param,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
  Get,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { Throttle, SkipThrottle } from '@nestjs/throttler';
import { GuestSessionsService } from '../services/guest-sessions.service';
import { GuestAuthGuard } from '../guards/guest-auth.guard';
import { CreateSessionDto, UuidParamDto } from '../dto';
import type { Request } from 'express';
import { GuestSession } from '../interfaces';
import { Public } from '../../../common/decorators/public.decorator';

// Extend Express Request to include guestSession
declare module 'express' {
  interface Request {
    guestSession?: GuestSession;
  }
}

@ApiTags('Guest Sessions')
@Controller('guest/sessions')
export class GuestSessionsController {
  constructor(private guestSessionsService: GuestSessionsService) {}

  @Public()
  @Post()
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 requests per minute for session creation
  @ApiOperation({ summary: 'Create a new guest session from QR token' })
  @ApiResponse({ status: 201, description: 'Session created successfully' })
  @ApiResponse({ status: 401, description: 'Invalid QR token' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async createSession(@Body() dto: CreateSessionDto) {
    return await this.guestSessionsService.createSession(dto);
  }

  @UseGuards(GuestAuthGuard)
  @Post(':id/heartbeat')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Keep session alive' })
  async heartbeat(@Param() params: UuidParamDto, @Req() req: Request) {
    const isActive = await this.guestSessionsService.heartbeat(params.id);

    if (!isActive) {
      return {
        isActive: false,
        message: 'Session expired or revoked',
      };
    }

    // Refresh access token
    const newToken = await this.guestSessionsService.refreshAccessToken(
      params.id,
    );

    return {
      isActive: true,
      guestAccessToken: newToken,
    };
  }

  @UseGuards(GuestAuthGuard)
  @Post(':id/close')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Close guest session (logout)' })
  async closeSession(@Param() params: UuidParamDto, @Req() req: Request) {
    await this.guestSessionsService.closeSession(params.id);

    return {
      closed: true,
      message: 'Session closed successfully',
    };
  }

  @UseGuards(GuestAuthGuard)
  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current session info' })
  async getCurrentSession(@Req() req: Request) {
    return {
      session: req.guestSession,
    };
  }
}
