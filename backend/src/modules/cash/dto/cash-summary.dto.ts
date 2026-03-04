import { ApiProperty } from '@nestjs/swagger';

export class CashSummaryDto {
  @ApiProperty({ description: 'Net Satış (Ciro)' })
  netSales: number;

  @ApiProperty({ description: 'Toplam Bahşiş' })
  totalTips: number;

  @ApiProperty({
    description:
      'Kasa Toplamı (Nakit + Nakit Bahşiş + Kasa Girişleri - Çıkışları)',
  })
  totalCash: number;

  @ApiProperty({ description: 'Ödenecek Bahşiş (Komisyon Düşülmüş)' })
  netTip: number;

  @ApiProperty({ description: 'Nakit Bahşiş' })
  cashTips: number;

  @ApiProperty({ description: 'Kart Bahşiş' })
  cardTips: number;

  @ApiProperty({ description: 'Kasadan dağıtılan bahşiş' })
  cashTipDistributed: number;

  @ApiProperty({ description: 'Manuel kasa girişi toplamı' })
  manualCashInTotal: number;

  @ApiProperty({ description: 'Manuel kasa çıkışı toplamı' })
  manualCashOutTotal: number;

  @ApiProperty({ description: 'Ödeme yöntemi kırılımı', required: false })
  paymentBreakdown?: Record<string, number>;
}
