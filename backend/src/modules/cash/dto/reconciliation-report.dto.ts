import { ApiProperty } from '@nestjs/swagger';

class RefundSummaryByMethodDto {
  /** @source operations.cash_movements.amount | @context subtype=refund,paymentMethod=cash | @nullable false */
  @ApiProperty()
  cash: number;

  /** @source operations.cash_movements.amount | @context subtype=refund,paymentMethod=card-family | @nullable false */
  @ApiProperty()
  card: number;

  /** @source operations.cash_movements.amount | @context subtype=refund,paymentMethod=open_account | @nullable false */
  @ApiProperty()
  openAccount: number;

  /** @source operations.cash_movements.amount | @context subtype=refund,paymentMethod=meal_voucher | @nullable false */
  @ApiProperty()
  mealVoucher: number;
}

class RefundSummaryDto {
  /** @source operations.cash_movements.amount | @context subtype=refund | @nullable false */
  @ApiProperty()
  totalRefunded: number;

  /** @source operations.cash_movements.id | @context subtype=refund count | @nullable false */
  @ApiProperty()
  refundCount: number;

  /** @source operations.cash_movements | @context refund grouped by method | @nullable false */
  @ApiProperty({ type: RefundSummaryByMethodDto })
  byMethod: RefundSummaryByMethodDto;

  /** @source computed(cash in - cash out) | @context includes refunds | @nullable false */
  @ApiProperty()
  netCash: number;
}

export class ReconciliationReportDto {
  /** @source snapshot/live compute | @context reconciliation endpoint | @nullable false */
  @ApiProperty({
    description:
      'Raporun canlı hesap (true) veya kapanış snapshot kaydı (false) olduğunu belirtir',
    default: false,
  })
  is_live: boolean;

  /** @source operations.cash_sessions.opened_at | @context session header | @nullable false */
  @ApiProperty({ description: 'Oturum açılış zamanı' })
  sessionOpenedAt: Date;

  /** @source operations.cash_sessions.closed_at | @context session header | @nullable true */
  @ApiProperty({ description: 'Oturum kapanış zamanı' })
  sessionClosedAt: Date | null;

  /** @source business.users | @context opened_by relation | @nullable false */
  @ApiProperty({ description: 'Oturumu açan personel' })
  openedBy: string;

  /** @source business.users | @context closed_by relation | @nullable true */
  @ApiProperty({ description: 'Oturumu kapatan personel' })
  closedBy: string | null;

  /** @source operations.cash_registers.name | @context session register | @nullable false */
  @ApiProperty({ description: 'Kasa adı' })
  cashRegisterName: string;

  /** @source operations.cash_sessions.opening_balance | @context session | @nullable false */
  @ApiProperty({ description: 'Açılış bakiyesi' })
  openingBalance: number;

  /** @source operations.cash_movements | @context type=sale,!void | @nullable false */
  @ApiProperty({ description: 'Toplam brüt satış' })
  totalGrossSales: number;

  /** @source operations.cash_movements | @context type=sale,isVoid | @nullable false */
  @ApiProperty({ description: 'İptal edilen satışlar toplamı' })
  voidedSales: number;

  /** @source operations.cash_movements | @context grouped by payment_method | @nullable false */
  @ApiProperty({ description: 'Ödeme yöntemlerine göre satışlar' })
  salesByMethod: Record<string, number>;

  /** @source operations.cash_movements | @context isTip=true | @nullable false */
  @ApiProperty({ description: 'Toplam bahşiş' })
  totalTip: number;

  /** @source business.restaurant_settings.tip_commission_rate | @context card tips | @nullable false */
  @ApiProperty({ description: 'Bahşiş komisyonu' })
  tipCommission: number;

  /** @source computed(totalTip-tipCommission) | @context reconciliation | @nullable false */
  @ApiProperty({ description: 'Net dağıtılacak bahşiş' })
  netTip: number;

  /** @source operations.cash_movements | @context cash tip out | @nullable false */
  @ApiProperty({ description: 'Kasadan dağıtılan bahşiş' })
  cashTipDistributed: number;

  /** @source operations.cash_movements | @context manual in regular | @nullable false */
  @ApiProperty({ description: 'Manuel kasa girişi toplamı' })
  manualCashInTotal: number;

  /** @source operations.cash_movements | @context manual out expense | @nullable false */
  @ApiProperty({ description: 'Masraf / gider toplamı' })
  expenseTotal: number;

  /** @source operations.cash_movements | @context manual adjustment in | @nullable false */
  @ApiProperty({ description: 'Düzeltme giriş toplamı' })
  adjustmentInTotal: number;

  /** @source operations.cash_movements | @context manual adjustment out | @nullable false */
  @ApiProperty({ description: 'Düzeltme çıkış toplamı' })
  adjustmentOutTotal: number;

  /** @source computed(opening + in - out) | @context expected drawer cash | @nullable false */
  @ApiProperty({ description: 'Sistemdeki beklenen nakit' })
  expectedCash: number;

  /** @source operations.cash_sessions.counted_balance | @context close flow | @nullable true */
  @ApiProperty({ description: 'Kasada sayılan gerçek nakit' })
  actualCash: number | null;

  /** @source operations.cash_sessions.difference | @context close flow | @nullable true */
  @ApiProperty({ description: 'Fark (Kasa fazlası/açığı)' })
  difference: number | null;

  /** @source computed(non-cash sales total) | @context reconciliation | @nullable false */
  @ApiProperty({
    description: 'Bankaya yatacak net miktar (POS + Yemek Çeki vb.)',
  })
  netBankAmount: number;

  /** @source operations.cash_movements | @context session scope | @nullable false */
  @ApiProperty({ description: 'Toplam hareket sayısı' })
  movementCount: number;

  /** @source operations.cash_movements | @context refund breakdown and net cash | @nullable false */
  @ApiProperty({ type: RefundSummaryDto })
  refundSummary: RefundSummaryDto;
}
