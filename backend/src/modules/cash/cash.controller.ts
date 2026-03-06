import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Query,
  Delete,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CashService } from './cash.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { GetUser } from '../../common/decorators/get-user.decorator';
import {
  OpenCashSessionDto,
  CloseCashSessionDto,
  CreateCashMovementDto,
  RegisterIdParamDto,
  SessionIdParamDto,
  CreateCashRegisterDto,
} from './dto/cash-ops.dto';
import { GetSessionHistoryDto } from './dto/get-session-history.dto';
import type { User } from '../users/entities/user.entity';

type CashUser = User & { restaurantId?: string };

@ApiTags('Cash Management')
@Controller('cash')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class CashController {
  constructor(private readonly cashService: CashService) {}

  private getRestaurantId(user: CashUser): string {
    return user.restaurantId || user.restaurant_id;
  }

  @Get('registers')
  @ApiOperation({
    summary: 'Get all cash registers with their current session status',
  })
  getRegisters(@GetUser() user: CashUser) {
    return this.cashService.getRegisters(this.getRestaurantId(user));
  }

  @Post('registers')
  @ApiOperation({ summary: 'Create a new cash register' })
  createRegister(
    @GetUser() user: CashUser,
    @Body() dto: CreateCashRegisterDto,
    @Req() request: Request,
  ) {
    return this.cashService.createRegister(
      this.getRestaurantId(user),
      dto,
      user,
      request,
    );
  }

  @Delete('registers/:registerId')
  @ApiOperation({ summary: 'Kasayı siler' })
  deleteRegister(
    @Param('registerId') registerId: string,
    @GetUser() user: CashUser,
    @Req() request: Request,
  ) {
    return this.cashService.deleteRegister(registerId, user, request);
  }

  @Get('registers/active-sessions')
  @ApiOperation({ summary: 'Tüm açık kasa oturumlarını getirir' })
  getAllActiveSessions(@GetUser() user: CashUser) {
    return this.cashService.getAllActiveSessions(this.getRestaurantId(user));
  }

  @Post('registers/ensure-default')
  @ApiOperation({ summary: 'Varsayılan kasayı hazırla' })
  ensureDefault(@GetUser() user: CashUser, @Req() request: Request) {
    return this.cashService.ensureDefaultRegister(
      this.getRestaurantId(user),
      user,
      request,
    );
  }

  @Get('registers/:registerId/sessions')
  @ApiOperation({ summary: 'Kasa oturumlarını listeler' })
  getSessions(@Param() params: RegisterIdParamDto) {
    return this.cashService.getSessions(params.registerId);
  }

  @Post('sessions/open')
  @ApiOperation({ summary: 'Yeni kasa oturumu açar' })
  openSession(
    @GetUser() user: CashUser,
    @Body() dto: OpenCashSessionDto,
    @Req() request: Request,
  ) {
    return this.cashService.openSession(
      this.getRestaurantId(user),
      user.id,
      dto,
      user,
      request,
    );
  }

  @Post('sessions/:sessionId/close')
  @ApiOperation({ summary: 'Kasa oturumunu kapatır' })
  closeSession(
    @GetUser() user: CashUser,
    @Param() params: SessionIdParamDto,
    @Body() dto: CloseCashSessionDto,
    @Req() request: Request,
  ) {
    return this.cashService.closeSession(
      user.id,
      params.sessionId,
      dto,
      undefined,
      user,
      request,
    );
  }

  @Get('sessions/:sessionId/movements')
  @ApiOperation({ summary: 'Kasa hareketlerini listeler' })
  getMovements(@Param() params: SessionIdParamDto) {
    return this.cashService.getMovements(params.sessionId);
  }

  @Get('sessions/:sessionId/summary')
  @ApiOperation({ summary: 'Kasa oturum özetini getirir' })
  getSessionSummary(@Param() params: SessionIdParamDto) {
    return this.cashService.getSessionSummary(params.sessionId);
  }

  @Get('sessions/:sessionId/reconciliation')
  @ApiOperation({ summary: 'Kasa oturum tam mutabakat raporunu getirir' })
  getReconciliationReport(
    @GetUser() user: CashUser,
    @Param() params: SessionIdParamDto,
  ) {
    return this.cashService.getReconciliationReport(
      this.getRestaurantId(user),
      params.sessionId,
    );
  }

  @Post('sessions/:sessionId/movements')
  @ApiOperation({ summary: 'Manuel kasa hareketi ekler' })
  addMovement(
    @GetUser() user: CashUser,
    @Param() params: SessionIdParamDto,
    @Body() dto: CreateCashMovementDto,
    @Req() request: Request,
  ) {
    return this.cashService.addMovement(
      user.id,
      params.sessionId,
      dto,
      undefined,
      user,
      request,
    );
  }

  @Get('sessions/history')
  @ApiOperation({
    summary: 'Tüm kasa oturumlarını filtrelerle getirir (raporlama)',
  })
  getSessionHistory(
    @GetUser() user: CashUser,
    @Query() filters: GetSessionHistoryDto,
  ) {
    return this.cashService.getSessionHistory(
      this.getRestaurantId(user),
      filters,
    );
  }

  @Get('sessions/:sessionId')
  @ApiOperation({ summary: 'Belirli bir kasa oturumunu ID ile getirir' })
  getSessionById(@Param() params: SessionIdParamDto) {
    return this.cashService.getSessionById(params.sessionId);
  }
}
