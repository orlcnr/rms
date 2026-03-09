import { Injectable } from '@nestjs/common';
import type { User } from '../users/entities/user.entity';
import { CreateAreaDto } from './dto/create-area.dto';
import { CreateTableDto } from './dto/create-table.dto';
import { GetAreasDto } from './dto/get-areas.dto';
import { GetTablesDto } from './dto/get-tables.dto';
import { UpdateTableStatusDto } from './dto/update-table-status.dto';
import { TablesAuthorizationService } from './services/tables-authorization.service';
import { TablesCommandService } from './services/tables-command.service';
import { TablesQueryService } from './services/tables-query.service';
import { RotateTableQrUseCase } from './use-cases/rotate-table-qr.use-case';
import { GenerateTableQrPdfUseCase } from './use-cases/generate-table-qr-pdf.use-case';
import { GenerateRestaurantQrPdfUseCase } from './use-cases/generate-restaurant-qr-pdf.use-case';

@Injectable()
export class TablesService {
  constructor(
    private readonly queryService: TablesQueryService,
    private readonly commandService: TablesCommandService,
    private readonly authorizationService: TablesAuthorizationService,
    private readonly rotateTableQrUseCase: RotateTableQrUseCase,
    private readonly generateTableQrPdfUseCase: GenerateTableQrPdfUseCase,
    private readonly generateRestaurantQrPdfUseCase: GenerateRestaurantQrPdfUseCase,
  ) {}

  getTables(user: User, filters: GetTablesDto) {
    return this.queryService.getTables(
      this.authorizationService.getRestaurantId(user),
      filters,
    );
  }

  getTableById(user: User, tableId: string) {
    return this.queryService.getTableById(
      this.authorizationService.getRestaurantId(user),
      tableId,
    );
  }

  getAreas(user: User, filters: GetAreasDto) {
    return this.queryService.getAreas(
      this.authorizationService.getRestaurantId(user),
      filters,
    );
  }

  createArea(user: User, dto: CreateAreaDto) {
    return this.commandService.createArea(
      this.authorizationService.getRestaurantId(user),
      dto,
    );
  }

  updateArea(user: User, id: string, dto: Partial<CreateAreaDto>) {
    return this.commandService.updateArea(
      this.authorizationService.getRestaurantId(user),
      id,
      dto,
    );
  }

  deleteArea(user: User, id: string) {
    return this.commandService.deleteArea(
      this.authorizationService.getRestaurantId(user),
      id,
    );
  }

  createTable(user: User, dto: CreateTableDto) {
    return this.commandService.createTable(
      this.authorizationService.getRestaurantId(user),
      dto,
    );
  }

  updateTable(user: User, id: string, dto: Partial<CreateTableDto>) {
    return this.commandService.updateTable(
      this.authorizationService.getRestaurantId(user),
      id,
      dto,
    );
  }

  updateTableStatus(user: User, id: string, dto: UpdateTableStatusDto) {
    return this.commandService.updateStatus(
      this.authorizationService.getRestaurantId(user),
      id,
      dto,
    );
  }

  deleteTable(user: User, id: string) {
    return this.commandService.deleteTable(
      this.authorizationService.getRestaurantId(user),
      id,
    );
  }

  getTableQr(user: User, tableId: string, restaurantName?: string) {
    return this.queryService.getTableQr(
      tableId,
      this.authorizationService.getRestaurantId(user),
      restaurantName,
    );
  }

  getAllTableQrs(user: User, restaurantName?: string) {
    return this.queryService.getAllTableQrs(
      this.authorizationService.getRestaurantId(user),
      restaurantName,
    );
  }

  getTableQrPdf(user: User, tableId: string, restaurantName?: string) {
    return this.generateTableQrPdfUseCase.execute(
      tableId,
      this.authorizationService.getRestaurantId(user),
      restaurantName,
    );
  }

  getRestaurantQrPdf(user: User, restaurantName?: string) {
    return this.generateRestaurantQrPdfUseCase.execute(
      this.authorizationService.getRestaurantId(user),
      restaurantName,
    );
  }

  async rotateQrCode(user: User, tableId: string) {
    const version = await this.rotateTableQrUseCase.execute(
      tableId,
      this.authorizationService.getRestaurantId(user),
    );

    return {
      success: true,
      message: 'QR code rotated successfully',
      version,
    };
  }

  hasOpenTables(restaurantId: string): Promise<boolean> {
    return this.commandService.hasOpenTables(restaurantId);
  }
}
