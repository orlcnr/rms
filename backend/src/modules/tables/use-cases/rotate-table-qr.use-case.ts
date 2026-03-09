import { Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Table } from '../entities/table.entity';

@Injectable()
export class RotateTableQrUseCase {
  constructor(private readonly dataSource: DataSource) {}

  async execute(tableId: string, restaurantId: string): Promise<string> {
    return this.dataSource.transaction(async (manager) => {
      const table = await manager.findOne(Table, {
        where: { id: tableId, restaurant_id: restaurantId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!table) {
        throw new NotFoundException('Masa bulunamadı');
      }

      table.qrVersion = (Number(table.qrVersion) || 0) + 1;
      await manager.save(Table, table);

      return String(table.qrVersion);
    });
  }
}
