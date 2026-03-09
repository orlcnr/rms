import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { TablesService } from './tables.service';
import { TablesController } from './tables.controller';
import { TableQrService } from './services/table-qr.service';
import { Table } from './entities/table.entity';
import { Area } from './entities/area.entity';
import { TableRepository } from './repositories/table.repository';
import { AreaRepository } from './repositories/area.repository';
import { OrderTableReadRepository } from './repositories/order-table-read.repository';
import { ReservationTableReadRepository } from './repositories/reservation-table-read.repository';
import { TableQueryFactory } from './query/factories/table-query.factory';
import { AreaQueryFactory } from './query/factories/area-query.factory';
import { TablesQueryService } from './services/tables-query.service';
import { TablesCommandService } from './services/tables-command.service';
import { TablesAuthorizationService } from './services/tables-authorization.service';
import { GetTableBoardUseCase } from './use-cases/get-table-board.use-case';
import { RotateTableQrUseCase } from './use-cases/rotate-table-qr.use-case';
import { GenerateTableQrPdfUseCase } from './use-cases/generate-table-qr-pdf.use-case';
import { GenerateRestaurantQrPdfUseCase } from './use-cases/generate-restaurant-qr-pdf.use-case';

@Module({
  imports: [
    TypeOrmModule.forFeature([Table, Area]),
    JwtModule.register({}),
    ConfigModule,
  ],
  controllers: [TablesController],
  providers: [
    TablesService,
    TableQrService,
    TableRepository,
    AreaRepository,
    OrderTableReadRepository,
    ReservationTableReadRepository,
    TableQueryFactory,
    AreaQueryFactory,
    TablesQueryService,
    TablesCommandService,
    TablesAuthorizationService,
    GetTableBoardUseCase,
    RotateTableQrUseCase,
    GenerateTableQrPdfUseCase,
    GenerateRestaurantQrPdfUseCase,
  ],
  exports: [TablesService, TableQrService],
})
export class TablesModule {}
