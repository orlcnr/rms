import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Query,
  Delete,
} from '@nestjs/common';
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

@ApiTags('Cash Management')
@Controller('cash')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class CashController {
  constructor(private readonly cashService: CashService) {}

  @Get('registers')
  @ApiOperation({ summary: 'Kasaları listeler' })
  getRegisters(@GetUser() user: any) {
    return this.cashService.getRegisters(user.restaurantId);
  }

  @Post('registers')
  @ApiOperation({ summary: 'Yeni kasa oluşturur' })
  createRegister(@GetUser() user: any, @Body() dto: CreateCashRegisterDto) {
    return this.cashService.createRegister(user.restaurantId, dto.name);
  }

  @Delete('registers/:registerId')
  @ApiOperation({ summary: 'Kasayı siler' })
  deleteRegister(@Param('registerId') registerId: string) {
    return this.cashService.deleteRegister(registerId);
  }

  @Get('registers/with-status')
  @ApiOperation({ summary: 'Kasaları durumlarıyla birlikte listeler' })
  getRegistersWithStatus(@GetUser() user: any) {
    return this.cashService.getRegistersWithStatus(user.restaurantId);
  }

  @Get('registers/active-sessions')
  @ApiOperation({ summary: 'Tüm açık kasa oturumlarını getirir' })
  getAllActiveSessions(@GetUser() user: any) {
    return this.cashService.getAllActiveSessions(user.restaurantId);
  }

  @Post('registers/ensure-default')
  @ApiOperation({ summary: 'Varsayılan kasayı hazırla' })
  ensureDefault(@GetUser() user: any) {
    return this.cashService.ensureDefaultRegister(user.restaurantId);
  }

  @Get('registers/:registerId/sessions')
  @ApiOperation({ summary: 'Kasa oturumlarını listeler' })
  getSessions(@Param() params: RegisterIdParamDto) {
    return this.cashService.getSessions(params.registerId);
  }

  @Post('sessions/open')
  @ApiOperation({ summary: 'Yeni kasa oturumu açar' })
  openSession(@GetUser() user: any, @Body() dto: OpenCashSessionDto) {
    return this.cashService.openSession(user.restaurantId, user.id, dto);
  }

  @Post('sessions/:sessionId/close')
  @ApiOperation({ summary: 'Kasa oturumunu kapatır' })
  closeSession(
    @GetUser() user: any,
    @Param() params: SessionIdParamDto,
    @Body() dto: CloseCashSessionDto,
  ) {
    return this.cashService.closeSession(user.id, params.sessionId, dto);
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

  @Post('sessions/:sessionId/movements')
  @ApiOperation({ summary: 'Manuel kasa hareketi ekler' })
  addMovement(
    @GetUser() user: any,
    @Param() params: SessionIdParamDto,
    @Body() dto: CreateCashMovementDto,
  ) {
    return this.cashService.addMovement(user.id, params.sessionId, dto);
  }

  @Get('sessions/history')
  @ApiOperation({
    summary: 'Tüm kasa oturumlarını filtrelerle getirir (raporlama)',
  })
  getSessionHistory(
    @GetUser() user: any,
    @Query() filters: GetSessionHistoryDto,
  ) {
    return this.cashService.getSessionHistory(user.restaurantId, filters);
  }
}
