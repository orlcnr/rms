import { Injectable, NotFoundException } from '@nestjs/common';
import { AreaResponseDto } from '../dto/area-response.dto';
import { GetAreasDto } from '../dto/get-areas.dto';
import { GetTablesDto } from '../dto/get-tables.dto';
import { TableResponseDto } from '../dto/table-response.dto';
import { AreaMapper } from '../mappers/area.mapper';
import { GetTableBoardUseCase } from '../use-cases/get-table-board.use-case';
import { AreaRepository } from '../repositories/area.repository';
import { AreaQueryFactory } from '../query/factories/area-query.factory';
import { TableQrService } from './table-qr.service';

@Injectable()
export class TablesQueryService {
  constructor(
    private readonly getTableBoardUseCase: GetTableBoardUseCase,
    private readonly areaRepository: AreaRepository,
    private readonly areaQueryFactory: AreaQueryFactory,
    private readonly tableQrService: TableQrService,
  ) {}

  async getTables(
    restaurantId: string,
    filters: GetTablesDto,
  ): Promise<TableResponseDto[]> {
    return this.getTableBoardUseCase.execute(restaurantId, filters);
  }

  async getTableById(
    restaurantId: string,
    tableId: string,
  ): Promise<TableResponseDto> {
    const rows = await this.getTableBoardUseCase.execute(restaurantId, {});
    const table = rows.find((row) => row.id === tableId);
    if (!table) {
      throw new NotFoundException('Masa bulunamadı');
    }
    return table;
  }

  async getAreas(
    restaurantId: string,
    filters: GetAreasDto,
  ): Promise<AreaResponseDto[]> {
    const qb = this.areaRepository.createBaseQuery(restaurantId);
    const specs = this.areaQueryFactory.create(filters, { restaurantId });
    for (const spec of specs) {
      spec.apply(qb);
    }

    qb.orderBy('area.name', 'ASC');
    const rows = await qb.getMany();
    return rows.map((row) => AreaMapper.toResponse(row));
  }

  getTableQr(tableId: string, restaurantId: string, restaurantName?: string) {
    return this.tableQrService.generateQrCodeForTable(
      tableId,
      restaurantId,
      restaurantName,
    );
  }

  getAllTableQrs(restaurantId: string, restaurantName?: string) {
    return this.tableQrService.generateQrCodesForRestaurant(
      restaurantId,
      restaurantName,
    );
  }
}
