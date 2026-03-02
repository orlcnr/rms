import { ApiProperty } from '@nestjs/swagger';

export class ReconciliationReportDto {
  @ApiProperty({ description: 'Oturum açılış zamanı' })
  sessionOpenedAt: Date;

  @ApiProperty({ description: 'Oturum kapanış zamanı' })
  sessionClosedAt: Date | null;

  @ApiProperty({ description: 'Oturumu açan personel' })
  openedBy: string;

  @ApiProperty({ description: 'Oturumu kapatan personel' })
  closedBy: string | null;

  @ApiProperty({ description: 'Kasa adı' })
  cashRegisterName: string;

  @ApiProperty({ description: 'Açılış bakiyesi' })
  openingBalance: number;

  @ApiProperty({ description: 'Toplam brüt satış' })
  totalGrossSales: number;

  @ApiProperty({ description: 'İptal edilen satışlar toplamı' })
  voidedSales: number;

  @ApiProperty({ description: 'Ödeme yöntemlerine göre satışlar' })
  salesByMethod: Record<string, number>;

  @ApiProperty({ description: 'Toplam bahşiş' })
  totalTip: number;

  @ApiProperty({ description: 'Bahşiş komisyonu' })
  tipCommission: number;

  @ApiProperty({ description: 'Net dağıtılacak bahşiş' })
  netTip: number;

  @ApiProperty({ description: 'Sistemdeki beklenen nakit' })
  expectedCash: number;

  @ApiProperty({ description: 'Kasada sayılan gerçek nakit' })
  actualCash: number | null;

  @ApiProperty({ description: 'Fark (Kasa fazlası/açığı)' })
  difference: number | null;

  @ApiProperty({
    description: 'Bankaya yatacak net miktar (POS + Yemek Çeki vb.)',
  })
  netBankAmount: number;

  @ApiProperty({ description: 'Toplam hareket sayısı' })
  movementCount: number;
}
