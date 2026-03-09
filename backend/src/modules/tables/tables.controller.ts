import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../common/decorators/get-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { ApiResponseDto } from '../../common/dto/api-response.dto';
import { Role } from '../../common/enums/role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { User } from '../users/entities/user.entity';
import { CreateAreaDto } from './dto/create-area.dto';
import { CreateTableDto } from './dto/create-table.dto';
import { GetAreasDto } from './dto/get-areas.dto';
import { GetTablesDto } from './dto/get-tables.dto';
import { UpdateTableStatusDto } from './dto/update-table-status.dto';
import { TablesService } from './tables.service';

@ApiTags('Tables')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('tables')
export class TablesController {
  constructor(private readonly tablesService: TablesService) {}

  @Get()
  @ApiOperation({ summary: 'Get tables board for current restaurant' })
  findAllTables(@GetUser() user: User, @Query() filters: GetTablesDto) {
    return this.tablesService
      .getTables(user, filters)
      .then((data) => ApiResponseDto.ok(data));
  }

  @Post()
  @Roles(Role.RESTAURANT_OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Create a new table' })
  createTable(@GetUser() user: User, @Body() createTableDto: CreateTableDto) {
    return this.tablesService
      .createTable(user, createTableDto)
      .then((data) => ApiResponseDto.ok(data));
  }

  @Get('areas')
  @ApiOperation({ summary: 'Get areas for current restaurant' })
  getAreas(@GetUser() user: User, @Query() filters: GetAreasDto) {
    return this.tablesService
      .getAreas(user, filters)
      .then((data) => ApiResponseDto.ok(data));
  }

  @Post('areas')
  @Roles(Role.RESTAURANT_OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Create area' })
  createArea(@GetUser() user: User, @Body() dto: CreateAreaDto) {
    return this.tablesService
      .createArea(user, dto)
      .then((data) => ApiResponseDto.ok(data));
  }

  @Patch('areas/:id')
  @Roles(Role.RESTAURANT_OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Update area' })
  updateArea(
    @GetUser() user: User,
    @Param('id') id: string,
    @Body() dto: Partial<CreateAreaDto>,
  ) {
    return this.tablesService
      .updateArea(user, id, dto)
      .then((data) => ApiResponseDto.ok(data));
  }

  @Delete('areas/:id')
  @Roles(Role.RESTAURANT_OWNER)
  @ApiOperation({ summary: 'Delete area' })
  deleteArea(@GetUser() user: User, @Param('id') id: string) {
    return this.tablesService
      .deleteArea(user, id)
      .then(() => ApiResponseDto.empty('Alan silindi'));
  }

  @Get(':id/qr')
  @Roles(Role.RESTAURANT_OWNER, Role.MANAGER, Role.WAITER)
  @ApiOperation({ summary: 'Get QR code data for a table' })
  getTableQrCode(
    @GetUser() user: User,
    @Param('id') id: string,
    @Query('restaurantName') restaurantName?: string,
  ) {
    return this.tablesService
      .getTableQr(user, id, restaurantName)
      .then((data) => ApiResponseDto.ok(data));
  }

  @Get(':id/qr/pdf')
  @Roles(Role.RESTAURANT_OWNER, Role.MANAGER, Role.WAITER)
  @ApiOperation({ summary: 'Download QR code PDF for a single table' })
  async getTableQrPdf(
    @GetUser() user: User,
    @Param('id') id: string,
    @Query('restaurantName') restaurantName: string,
    @Res() res: Response,
  ) {
    const pdfBuffer = await this.tablesService.getTableQrPdf(
      user,
      id,
      restaurantName,
    );

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="table-qr-${id}.pdf"`,
    );
    res.send(pdfBuffer);
  }

  @Get('qr/all')
  @Roles(Role.RESTAURANT_OWNER, Role.MANAGER)
  @ApiOperation({
    summary: 'Get QR codes for all tables in current restaurant',
  })
  getAllTableQrCodes(
    @GetUser() user: User,
    @Query('restaurantName') restaurantName?: string,
  ) {
    return this.tablesService
      .getAllTableQrs(user, restaurantName)
      .then((data) => ApiResponseDto.ok(data));
  }

  @Get('qr/pdf')
  @Roles(Role.RESTAURANT_OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Download PDF with QR codes for all tables' })
  async getBulkQrPdf(
    @GetUser() user: User,
    @Query('restaurantName') restaurantName: string,
    @Res() res: Response,
  ) {
    const pdfBuffer = await this.tablesService.getRestaurantQrPdf(
      user,
      restaurantName,
    );

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="all-tables-qr.pdf"',
    );
    res.send(pdfBuffer);
  }

  @Post(':id/qr/rotate')
  @Roles(Role.RESTAURANT_OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Rotate table QR token/version' })
  rotateQrCode(@GetUser() user: User, @Param('id') id: string) {
    return this.tablesService
      .rotateQrCode(user, id)
      .then((data) => ApiResponseDto.ok(data));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get table detail' })
  findOne(@GetUser() user: User, @Param('id') id: string) {
    return this.tablesService
      .getTableById(user, id)
      .then((data) => ApiResponseDto.ok(data));
  }

  @Patch(':id')
  @Roles(Role.RESTAURANT_OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Update table' })
  updateTable(
    @GetUser() user: User,
    @Param('id') id: string,
    @Body() updateTableDto: Partial<CreateTableDto>,
  ) {
    return this.tablesService
      .updateTable(user, id, updateTableDto)
      .then((data) => ApiResponseDto.ok(data));
  }

  @Patch(':id/status')
  @Roles(Role.RESTAURANT_OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Update table status (OUT_OF_SERVICE management)' })
  updateStatus(
    @GetUser() user: User,
    @Param('id') id: string,
    @Body() dto: UpdateTableStatusDto,
  ) {
    return this.tablesService
      .updateTableStatus(user, id, dto)
      .then((data) => ApiResponseDto.ok(data));
  }

  @Delete(':id')
  @Roles(Role.RESTAURANT_OWNER)
  @ApiOperation({ summary: 'Delete table' })
  deleteTable(@GetUser() user: User, @Param('id') id: string) {
    return this.tablesService
      .deleteTable(user, id)
      .then(() => ApiResponseDto.empty('Masa silindi'));
  }
}
