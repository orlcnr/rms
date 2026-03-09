import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateAreaDto } from '../dto/create-area.dto';
import { CreateTableDto } from '../dto/create-table.dto';
import { UpdateTableStatusDto } from '../dto/update-table-status.dto';
import { AreaResponseDto } from '../dto/area-response.dto';
import { TableResponseDto } from '../dto/table-response.dto';
import { AreaMapper } from '../mappers/area.mapper';
import { TableMapper } from '../mappers/table.mapper';
import { AreaRepository } from '../repositories/area.repository';
import { TableRepository } from '../repositories/table.repository';
import { TableStatus } from '../entities/table.entity';
import { OrderTableReadRepository } from '../repositories/order-table-read.repository';

@Injectable()
export class TablesCommandService {
  constructor(
    private readonly areaRepository: AreaRepository,
    private readonly tableRepository: TableRepository,
    private readonly orderTableReadRepository: OrderTableReadRepository,
  ) {}

  async createArea(
    restaurantId: string,
    dto: CreateAreaDto,
  ): Promise<AreaResponseDto> {
    const entity = this.areaRepository.create({
      name: dto.name,
      restaurant_id: restaurantId,
    });
    const saved = await this.areaRepository.save(entity);
    return AreaMapper.toResponse(saved);
  }

  async updateArea(
    restaurantId: string,
    id: string,
    dto: Partial<CreateAreaDto>,
  ): Promise<AreaResponseDto> {
    const area = await this.areaRepository.findOneByIdAndRestaurant(
      id,
      restaurantId,
    );
    if (!area) {
      throw new NotFoundException('Alan bulunamadı');
    }

    if (dto.name !== undefined) {
      area.name = dto.name;
    }

    const saved = await this.areaRepository.save(area);
    return AreaMapper.toResponse(saved);
  }

  async deleteArea(restaurantId: string, id: string): Promise<void> {
    const area = await this.areaRepository.findOneByIdAndRestaurant(
      id,
      restaurantId,
    );
    if (!area) {
      throw new NotFoundException('Alan bulunamadı');
    }
    await this.areaRepository.deleteById(id);
  }

  async createTable(
    restaurantId: string,
    dto: CreateTableDto,
  ): Promise<TableResponseDto> {
    const entity = this.tableRepository.create({
      name: dto.name,
      capacity: dto.capacity,
      area_id: dto.area_id,
      restaurant_id: restaurantId,
      status:
        dto.status === TableStatus.OUT_OF_SERVICE
          ? TableStatus.OUT_OF_SERVICE
          : TableStatus.AVAILABLE,
    });

    const saved = await this.tableRepository.save(entity);
    return TableMapper.toResponse({
      table: saved,
      activeOrder: null,
      reservations: [],
    });
  }

  async updateTable(
    restaurantId: string,
    id: string,
    dto: Partial<CreateTableDto>,
  ): Promise<TableResponseDto> {
    const table = await this.tableRepository.findOneByIdAndRestaurant(
      id,
      restaurantId,
    );
    if (!table) {
      throw new NotFoundException('Masa bulunamadı');
    }

    if (dto.name !== undefined) table.name = dto.name;
    if (dto.capacity !== undefined) table.capacity = dto.capacity;
    if (dto.area_id !== undefined) table.area_id = dto.area_id;
    if (dto.status !== undefined) {
      if (
        ![TableStatus.AVAILABLE, TableStatus.OUT_OF_SERVICE].includes(
          dto.status,
        )
      ) {
        throw new BadRequestException(
          'Sadece OUT_OF_SERVICE yönetimi desteklenir',
        );
      }
      table.status = dto.status;
    }

    const saved = await this.tableRepository.save(table);
    return TableMapper.toResponse({
      table: saved,
      activeOrder: null,
      reservations: [],
    });
  }

  async updateStatus(
    restaurantId: string,
    id: string,
    dto: UpdateTableStatusDto,
  ): Promise<TableResponseDto> {
    if (
      ![TableStatus.AVAILABLE, TableStatus.OUT_OF_SERVICE].includes(dto.status)
    ) {
      throw new BadRequestException(
        'Sadece OUT_OF_SERVICE/AVAILABLE set edilebilir',
      );
    }

    const table = await this.tableRepository.findOneByIdAndRestaurant(
      id,
      restaurantId,
    );
    if (!table) {
      throw new NotFoundException('Masa bulunamadı');
    }

    table.status = dto.status;
    const saved = await this.tableRepository.save(table);
    return TableMapper.toResponse({
      table: saved,
      activeOrder: null,
      reservations: [],
    });
  }

  async deleteTable(restaurantId: string, id: string): Promise<void> {
    const table = await this.tableRepository.findOneByIdAndRestaurant(
      id,
      restaurantId,
    );
    if (!table) {
      throw new NotFoundException('Masa bulunamadı');
    }
    await this.tableRepository.deleteById(id);
  }

  async hasOpenTables(restaurantId: string): Promise<boolean> {
    const activeOrders =
      await this.orderTableReadRepository.findActiveByRestaurant(restaurantId);
    return activeOrders.length > 0;
  }
}
