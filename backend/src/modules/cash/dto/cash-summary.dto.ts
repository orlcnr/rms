import { ApiProperty } from '@nestjs/swagger';

export class CashSummaryDto {
  /** @source operations.cash_movements | @context session scope | @nullable false */
  @ApiProperty({ description: 'Net Satış (Ciro)' })
  netSales: number;

  /** @source operations.cash_movements | @context session scope | @nullable false */
  @ApiProperty({ description: 'Toplam Bahşiş' })
  totalTips: number;

  /** @source computed(summary) | @context session scope | @nullable false */
  @ApiProperty({
    description:
      'Kasa Toplamı (Nakit + Nakit Bahşiş + Kasa Girişleri - Çıkışları)',
  })
  totalCash: number;

  /** @source computed(tip_commission_rate) | @context session scope | @nullable false */
  @ApiProperty({ description: 'Ödenecek Bahşiş (Komisyon Düşülmüş)' })
  netTip: number;

  /** @source operations.cash_movements | @context paymentMethod=cash,isTip=true | @nullable false */
  @ApiProperty({ description: 'Nakit Bahşiş' })
  cashTips: number;

  /** @source operations.cash_movements | @context paymentMethod!=cash,isTip=true | @nullable false */
  @ApiProperty({ description: 'Kart Bahşiş' })
  cardTips: number;

  /** @source operations.cash_movements | @context type=out,isTip=true | @nullable false */
  @ApiProperty({ description: 'Kasadan dağıtılan bahşiş' })
  cashTipDistributed: number;

  /** @source operations.cash_movements | @context isManualCashIn=true | @nullable false */
  @ApiProperty({ description: 'Manuel kasa girişi toplamı' })
  manualCashInTotal: number;

  /** @source operations.cash_movements | @context isManualCashOut=true | @nullable false */
  @ApiProperty({ description: 'Manuel kasa çıkışı toplamı' })
  manualCashOutTotal: number;

  /** @source operations.cash_movements | @context payment breakdown | @nullable true */
  @ApiProperty({ description: 'Ödeme yöntemi kırılımı', required: false })
  paymentBreakdown?: Record<string, number>;
}
