import { BadRequestException } from '@nestjs/common';
import {
  differenceInCalendarDays,
  endOfDay,
  parse,
  parseISO,
  startOfDay,
} from 'date-fns';
import { SelectQueryBuilder } from 'typeorm';
import { QuerySpec } from '../../../../../common/query/query-spec.interface';
import { StockMovement } from '../../../entities/stock-movement.entity';

export class MovementDateRangeSpec implements QuerySpec<StockMovement> {
  constructor(
    private readonly startDate?: string,
    private readonly endDate?: string,
  ) {}

  private parseDateInput(value?: string): Date | undefined {
    if (!value) {
      return undefined;
    }

    const normalized = value.trim();
    if (!normalized) {
      return undefined;
    }

    const isoParsed = parseISO(normalized);
    if (!Number.isNaN(isoParsed.getTime())) {
      return isoParsed;
    }

    const trParsed = parse(normalized, 'dd.MM.yyyy', new Date());
    if (!Number.isNaN(trParsed.getTime())) {
      return trParsed;
    }

    throw new BadRequestException(
      'Geçersiz tarih formatı. YYYY-MM-DD veya DD.MM.YYYY bekleniyor',
    );
  }

  apply(
    qb: SelectQueryBuilder<StockMovement>,
  ): SelectQueryBuilder<StockMovement> {
    const parsedStartDate = this.parseDateInput(this.startDate);
    const parsedEndDate = this.parseDateInput(this.endDate);

    if (parsedStartDate && parsedEndDate) {
      const diffInDays = differenceInCalendarDays(
        parsedEndDate,
        parsedStartDate,
      );
      if (diffInDays < 0) {
        throw new BadRequestException(
          'Bitiş tarihi başlangıç tarihinden önce olamaz',
        );
      }
      if (diffInDays > 31) {
        throw new BadRequestException('Tarih aralığı 31 günden fazla olamaz');
      }
    }

    if (parsedStartDate) {
      const normalizedStartDate = startOfDay(parsedStartDate);
      qb.andWhere('movement.created_at >= :startDate', {
        startDate: normalizedStartDate,
      });
    }

    if (parsedEndDate) {
      const normalizedEndDate = endOfDay(parsedEndDate);
      qb.andWhere('movement.created_at <= :endDate', {
        endDate: normalizedEndDate,
      });
    }

    return qb;
  }
}
