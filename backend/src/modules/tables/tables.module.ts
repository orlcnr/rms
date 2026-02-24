import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { TablesService } from './tables.service';
import { TablesController } from './tables.controller';
import { TableQrService } from './services/table-qr.service';
import { Table } from './entities/table.entity';
import { Area } from './entities/area.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Table, Area]),
    JwtModule.register({}),
    ConfigModule,
  ],
  controllers: [TablesController],
  providers: [TablesService, TableQrService],
  exports: [TablesService, TableQrService],
})
export class TablesModule {}
