import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  UseGuards,
  Res,
  Query,
} from '@nestjs/common';
import type { Response } from 'express';
import { TablesService } from './tables.service';
import { TableQrService } from './services/table-qr.service';
import { CreateTableDto } from './dto/create-table.dto';
import { CreateAreaDto } from './dto/create-area.dto';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { TableStatus } from './entities/table.entity';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';

@ApiTags('Tables')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('tables')
export class TablesController {
  constructor(
    private readonly tablesService: TablesService,
    private readonly tableQrService: TableQrService,
  ) {}

  @Post('areas')
  @Roles(Role.RESTAURANT_OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Create a new area' })
  createArea(@Body() createAreaDto: CreateAreaDto) {
    return this.tablesService.createArea(createAreaDto);
  }

  @Get('restaurants/:restaurantId/areas')
  @ApiOperation({ summary: 'Get all areas for a restaurant' })
  findAllAreas(@Param('restaurantId') restaurantId: string) {
    return this.tablesService.findAllAreasByRestaurant(restaurantId);
  }

  @Patch('areas/:id')
  @Roles(Role.RESTAURANT_OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Update an area' })
  updateArea(
    @Param('id') id: string,
    @Body() updateAreaDto: Partial<CreateAreaDto>,
  ) {
    return this.tablesService.updateArea(id, updateAreaDto);
  }

  @Delete('areas/:id')
  @Roles(Role.RESTAURANT_OWNER)
  @ApiOperation({ summary: 'Delete an area' })
  deleteArea(@Param('id') id: string) {
    return this.tablesService.deleteArea(id);
  }

  @Post()
  @Roles(Role.RESTAURANT_OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Create a new table' })
  createTable(@Body() createTableDto: CreateTableDto) {
    return this.tablesService.createTable(createTableDto);
  }

  @Get('restaurants/:restaurantId')
  @ApiOperation({ summary: 'Get all tables for a restaurant' })
  findAllTables(@Param('restaurantId') restaurantId: string) {
    return this.tablesService.findAllTablesByRestaurant(restaurantId);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update table status' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: Object.values(TableStatus) },
      },
    },
  })
  updateStatus(@Param('id') id: string, @Body('status') status: TableStatus) {
    return this.tablesService.updateTableStatus(id, status);
  }

  @Patch(':id')
  @Roles(Role.RESTAURANT_OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Update a table' })
  updateTable(
    @Param('id') id: string,
    @Body() updateTableDto: Partial<CreateTableDto>,
  ) {
    return this.tablesService.updateTable(id, updateTableDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single table detail' })
  findOne(@Param('id') id: string) {
    return this.tablesService.findOne(id);
  }

  @Delete(':id')
  @Roles(Role.RESTAURANT_OWNER)
  @ApiOperation({ summary: 'Delete a table' })
  deleteTable(@Param('id') id: string) {
    return this.tablesService.deleteTable(id);
  }

  // QR Code Endpoints

  @Get(':id/qr')
  @Roles(Role.RESTAURANT_OWNER, Role.MANAGER, Role.WAITER)
  @ApiOperation({ summary: 'Get QR code data for a table' })
  async getTableQrCode(
    @Param('id') id: string,
    @Query('restaurantId') restaurantId: string,
    @Query('restaurantName') restaurantName?: string,
  ) {
    return this.tableQrService.generateQrCodeForTable(
      id,
      restaurantId,
      restaurantName,
    );
  }

  @Get(':id/qr/pdf')
  @Roles(Role.RESTAURANT_OWNER, Role.MANAGER, Role.WAITER)
  @ApiOperation({ summary: 'Download QR code PDF for a single table' })
  async getTableQrPdf(
    @Param('id') id: string,
    @Query('restaurantId') restaurantId: string,
    @Query('restaurantName') restaurantName: string,
    @Res() res: Response,
  ) {
    const pdfBuffer = await this.tableQrService.generateSingleQrPdf(
      id,
      restaurantId,
      restaurantName,
    );

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="table-qr-${id}.pdf"`,
    );
    res.send(pdfBuffer);
  }

  @Get('restaurants/:restaurantId/qr/all')
  @Roles(Role.RESTAURANT_OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Get QR codes for all tables in a restaurant' })
  async getAllTableQrCodes(
    @Param('restaurantId') restaurantId: string,
    @Query('restaurantName') restaurantName?: string,
  ) {
    return this.tableQrService.generateQrCodesForRestaurant(
      restaurantId,
      restaurantName,
    );
  }

  @Get('restaurants/:restaurantId/qr/pdf')
  @Roles(Role.RESTAURANT_OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Download PDF with QR codes for all tables' })
  async getBulkQrPdf(
    @Param('restaurantId') restaurantId: string,
    @Query('restaurantName') restaurantName: string,
    @Res() res: Response,
  ) {
    const pdfBuffer = await this.tableQrService.generateBulkQrPdf(
      restaurantId,
      restaurantName,
    );

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="all-tables-qr.pdf"`,
    );
    res.send(pdfBuffer);
  }

  @Post(':id/qr/rotate')
  @Roles(Role.RESTAURANT_OWNER, Role.MANAGER)
  @ApiOperation({
    summary: 'Rotate QR code for a table (invalidates old QR codes)',
  })
  async rotateQrCode(@Param('id') id: string) {
    const newToken = await this.tableQrService.rotateQrCode(id);
    return {
      success: true,
      message: 'QR code rotated successfully',
      token: newToken,
    };
  }
}
