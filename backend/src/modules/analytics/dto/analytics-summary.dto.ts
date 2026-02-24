import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsObject, ValidateNested, Min, IsString } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Saatlik satış verisi
 */
export class HourlySalesDto {
  @ApiProperty({
    description: 'Saat (0-23)',
    example: 14,
  })
  @IsNumber()
  @Min(0)
  hour: number;

  @ApiProperty({
    description: 'Tam tarih ve saat (ISO)',
    example: '2024-02-13T14:00:00Z',
  })
  @IsString()
  dateTime: string;

  @ApiProperty({
    description: 'Saatlik toplam satış tutarı (ödenmiş siparişler)',
    example: 1500,
  })
  @IsNumber()
  @Min(0)
  totalSales: number;

  @ApiProperty({
    description: 'Saatlik sipariş sayısı (ödenmiş)',
    example: 5,
  })
  @IsNumber()
  @Min(0)
  orderCount: number;

  @ApiProperty({
    description: 'Ödenmemiş açık siparişlerin toplam tutarı',
    example: 800,
  })
  @IsNumber()
  @Min(0)
  unpaidAmount: number;

  @ApiProperty({
    description: 'Ödenmemiş açık sipariş sayısı',
    example: 3,
  })
  @IsNumber()
  @Min(0)
  unpaidOrderCount: number;

  @ApiProperty({
    description: 'Saatlik gerçek tahsilat tutarı',
    example: 1200,
  })
  @IsNumber()
  @Min(0)
  collectedAmount: number;
}

/**
 * Günlük gelir metrikleri
 */
export class DailyRevenueDto {
  @ApiProperty({
    description: 'Bugünkü toplam gelir',
    example: 28500,
  })
  @IsNumber()
  @Min(0)
  today: number;

  @ApiProperty({
    description: 'Dünkü toplam gelir',
    example: 0,
  })
  @IsNumber()
  @Min(0)
  yesterday: number;

  @ApiProperty({
    description: 'Yüzdelik değişim trendi',
    example: 0,
  })
  @IsNumber()
  trend: number;
}

/**
 * Ödeme dağılım verisi
 */
export class PaymentDistributionDto {
  @ApiProperty({ description: 'Ödeme yöntemi', example: 'cash' })
  method: string;

  @ApiProperty({ description: 'Toplam tutar', example: 5000 })
  amount: number;

  @ApiProperty({ description: 'Yüzdelik oran', example: 45 })
  percentage: number;
}

/**
 * Sipariş tipi dağılım verisi
 */
export class OrderTypeDistributionDto {
  @ApiProperty({ description: 'Sipariş tipi', example: 'dine_in' })
  type: string;

  @ApiProperty({ description: 'Toplam tutar', example: 12000 })
  amount: number;

  @ApiProperty({ description: 'Sipariş sayısı', example: 25 })
  count: number;

  @ApiProperty({ description: 'Yüzdelik oran', example: 40 })
  percentage: number;
}

/**
 * Analytics özet verisi
 */
export class AnalyticsSummaryDto {
  @ApiProperty({
    description: 'Günlük gelir metrikleri',
    type: DailyRevenueDto,
  })
  @IsObject()
  @ValidateNested()
  @Type(() => DailyRevenueDto)
  dailyRevenue: DailyRevenueDto;

  @ApiProperty({
    description: 'Aktif sipariş sayısı',
    example: 0,
  })
  @IsNumber()
  @Min(0)
  activeOrdersCount: number;

  @ApiProperty({
    description: 'Masa doluluk oranı (%)',
    example: 0,
    minimum: 0,
    maximum: 100,
  })
  @IsNumber()
  @Min(0)
  occupancyRate: number;

  @ApiProperty({
    description: 'Ortalama sipariş değeri',
    example: 0,
  })
  @IsNumber()
  @Min(0)
  averageOrderValue: number;

  @ApiProperty({
    description: 'Ödeme yöntemi dağılımı',
    type: [PaymentDistributionDto],
  })
  paymentDistribution?: PaymentDistributionDto[];

  @ApiProperty({
    description: 'Sipariş tipi dağılımı',
    type: [OrderTypeDistributionDto],
  })
  orderTypeDistribution?: OrderTypeDistributionDto[];
}
