import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../../common/decorators/public.decorator';
import { SuperAdminAuthService } from './super-admin-auth.service';
import { SuperAdminLoginDto } from './dto/super-admin-login.dto';
import { SuperAdminRefreshDto } from './dto/super-admin-refresh.dto';
import { ChangeSuperAdminPasswordDto } from './dto/change-super-admin-password.dto';
import { SuperAdminJwtAuthGuard } from './guards/super-admin-jwt-auth.guard';
import { SuperAdminRefreshAuthGuard } from './guards/super-admin-refresh-auth.guard';
import { readCookie } from '../../common/utils/cookie.util';

@ApiTags('Super Admin Auth')
@Controller('super-admin/auth')
export class SuperAdminAuthController {
  constructor(private readonly superAdminAuthService: SuperAdminAuthService) {}

  @Public()
  @Post('login')
  @Throttle({ default: { limit: 5, ttl: 15 * 60 * 1000 } })
  @ApiOperation({ summary: 'Login as a super admin' })
  async login(
    @Body() loginDto: SuperAdminLoginDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const login = await this.superAdminAuthService.login(
      loginDto.email,
      loginDto.password,
      request,
    );

    response.cookie('admin_refresh_token', login.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/api/v1/super-admin/auth',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return {
      access_token: login.access_token,
      must_change_password: login.must_change_password,
    };
  }

  @Public()
  @UseGuards(SuperAdminRefreshAuthGuard)
  @Post('refresh')
  @HttpCode(200)
  @ApiOperation({ summary: 'Refresh super admin access token' })
  async refresh(
    @Body() refreshDto: SuperAdminRefreshDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const refreshToken =
      refreshDto.refresh_token ||
      readCookie(request.headers.cookie, 'admin_refresh_token');

    if (!refreshToken) {
      throw new BadRequestException('Refresh token is required');
    }

    const tokens = await this.superAdminAuthService.refresh(refreshToken);

    response.cookie('admin_refresh_token', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/api/v1/super-admin/auth',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return {
      access_token: tokens.accessToken,
      must_change_password: tokens.must_change_password,
    };
  }

  @Public()
  @Post('logout')
  @HttpCode(200)
  @ApiOperation({ summary: 'Logout a super admin session' })
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const refreshToken = readCookie(request.headers.cookie, 'admin_refresh_token');

    await this.superAdminAuthService.logout(refreshToken);

    response.clearCookie('admin_refresh_token', {
      path: '/api/v1/super-admin/auth',
    });

    return { success: true };
  }

  @ApiBearerAuth()
  @UseGuards(SuperAdminJwtAuthGuard)
  @Get('me')
  @ApiOperation({ summary: 'Get the current super admin profile' })
  async me(@Req() request: Request) {
    const user = request.user as { id: string } | undefined;
    return this.superAdminAuthService.getProfile(user?.id || '');
  }

  @ApiBearerAuth()
  @UseGuards(SuperAdminJwtAuthGuard)
  @Post('change-password')
  @ApiOperation({ summary: 'Change the current super admin password' })
  async changePassword(
    @Body() dto: ChangeSuperAdminPasswordDto,
    @Req() request: Request,
  ) {
    const user = request.user as { id: string } | undefined;

    return this.superAdminAuthService.changePassword(
      user?.id || '',
      dto.password,
    );
  }
}
