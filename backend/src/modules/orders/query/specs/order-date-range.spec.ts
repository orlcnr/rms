import { BadRequestException } from '@nestjs/common';
import { format, parseISO } from 'date-fns';
import { SelectQueryBuilder } from 'typeorm';
import { QuerySpec } from '../../../../common/query/query-spec.interface';
import { Order } from '../../entities/order.entity';

export class OrderDateRangeSpec implements QuerySpec<Order> {
  constructor(
    private readonly startDate?: string,
    private readonly endDate?: string,
  ) {}

  private normalizeDate(value?: string): string | undefined {
    if (!value) {
      return undefined;
    }

    const normalized = value.trim();
    if (!normalized) {
      return undefined;
    }

    const parsed = parseISO(normalized);
    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException(
        'Geçersiz tarih formatı. YYYY-MM-DD bekleniyor',
      );
    }

    return format(parsed, 'yyyy-MM-dd');
  }

  apply(qb: SelectQueryBuilder<Order>): SelectQueryBuilder<Order> {
    const normalizedStart = this.normalizeDate(this.startDate);
    const normalizedEnd = this.normalizeDate(this.endDate);

    if (normalizedStart && normalizedEnd && normalizedStart > normalizedEnd) {
      throw new BadRequestException(
        'Bitiş tarihi başlangıç tarihinden önce olamaz',
      );
    }

    if (normalizedStart) {
      qb.andWhere(
        "CAST(order.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Istanbul' AS DATE) >= :startDate",
        { startDate: normalizedStart },
      );
    }

    if (normalizedEnd) {
      qb.andWhere(
        "CAST(order.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Istanbul' AS DATE) <= :endDate",
        { endDate: normalizedEnd },
      );
    }

    return qb;
  }
}
