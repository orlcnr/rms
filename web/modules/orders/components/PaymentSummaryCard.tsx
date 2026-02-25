'use client';

import { 
  Calculator, 
  ArrowDown, 
  ArrowUp, 
  Minus,
  CheckCircle2,
  AlertCircle 
} from 'lucide-react';
import { formatPaymentAmount } from '../types';

// ============================================
// PAYMENT SUMMARY CARD - Ödeme Özet Kartı
// DESIGN_TOKENS standartlarına uygun görselleştirme
// ============================================

interface PaymentSummaryCardProps {
  // Tutarlar
  subtotal: number;        // Ara toplam (indirimsiz)
  discount?: number;        // İndirim miktarı
  discountType?: 'discount' | 'complimentary';
  discountReason?: string;  // İndirim sebebi
  finalTotal: number;       // Final toplam (indirimli)
  totalPaid: number;        // Ödenen
  remainingBalance: number; // Kalan
  totalChange?: number;     // Para üstü
  
  // Durum
  isComplete: boolean;
  isProcessing?: boolean;
  
  // Callback
  onApplyDiscount?: () => void;
}

export function PaymentSummaryCard({
  subtotal,
  discount = 0,
  discountType,
  discountReason,
  finalTotal,
  totalPaid,
  remainingBalance,
  totalChange = 0,
  isComplete,
  isProcessing = false,
  onApplyDiscount,
}: PaymentSummaryCardProps) {
  
  // Renk sınıfları (DESIGN_TOKENS)
  const colors = {
    success: 'text-success-main bg-success-main/10',
    danger: 'text-danger-main bg-danger-main/10',
    warning: 'text-warning-main bg-warning-main/10',
    primary: 'text-primary-main bg-primary-main/10',
    muted: 'text-text-muted',
    primaryText: 'text-text-primary',
  };

  return (
    <div className="bg-bg-surface border border-border-light rounded-sm p-4 space-y-3">
      {/* Başlık */}
      <div className="flex items-center gap-2 pb-3 border-b border-border-light">
        <Calculator className="h-4 w-4 text-primary-main" />
        <h3 className="text-sm font-black text-text-primary uppercase tracking-wider">
          Ödeme Özeti
        </h3>
      </div>

      {/* Ara Toplam */}
      <div className="flex justify-between items-center">
        <span className="text-sm text-text-secondary">Ara Toplam</span>
        <span className="text-base font-bold text-text-primary">
          {formatPaymentAmount(subtotal)}
        </span>
      </div>

      {/* İndirim */}
      {discount > 0 && (
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="text-sm text-text-secondary">
              {discountType === 'complimentary' ? 'İkram' : 'İskonto'}
            </span>
            {discountReason && (
              <span className="text-xs text-text-muted" title={discountReason}>
                <Minus className="h-3 w-3 inline" />
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 text-danger-main">
            <ArrowDown className="h-3 w-3" />
            <span className="text-sm font-bold">
              -{formatPaymentAmount(discount)}
            </span>
          </div>
        </div>
      )}

      {/* Final Toplam (ödenecek) */}
      {discount > 0 && (
        <div className="flex justify-between items-center pt-2 border-t border-border-light">
          <span className="text-sm font-semibold text-text-primary">NET TUTAR</span>
          <span className="text-lg font-black text-primary-main">
            {formatPaymentAmount(finalTotal)}
          </span>
        </div>
      )}

      {/* Bölü çizgisi */}
      <div className="border-t border-border-light my-2" />

      {/* Ödenen */}
      <div className="flex justify-between items-center">
        <span className="text-sm text-text-secondary">Ödenen</span>
        <span className={`text-base font-bold ${totalPaid > 0 ? colors.success : colors.muted}`}>
          {formatPaymentAmount(totalPaid)}
        </span>
      </div>

      {/* Kalan Tutar */}
      <div className="flex justify-between items-center">
        <span className="text-sm font-semibold text-text-primary">Kalan</span>
        {isComplete ? (
          <div className="flex items-center gap-1 text-success-main">
            <CheckCircle2 className="h-4 w-4" />
            <span className="text-base font-bold">0,00 TL</span>
          </div>
        ) : (
          <div className="flex items-center gap-1 text-danger-main">
            <AlertCircle className="h-4 w-4" />
            <span className="text-base font-bold">
              {formatPaymentAmount(remainingBalance)}
            </span>
          </div>
        )}
      </div>

      {/* Para Üstü (varsa) */}
      {totalChange > 0 && (
        <div className="flex justify-between items-center p-2 bg-success-main/10 rounded-sm">
          <span className="text-sm font-semibold text-success-main">Para Üstü</span>
          <span className="text-lg font-black text-success-main">
            {formatPaymentAmount(totalChange)}
          </span>
        </div>
      )}

      {/* Durum Göstergesi */}
      <div className={`mt-4 p-3 rounded-sm text-center ${
        isComplete 
          ? colors.success 
          : isProcessing 
            ? colors.warning 
            : colors.danger
      }`}>
        {isProcessing ? (
          <span className="text-sm font-semibold">İşleniyor...</span>
        ) : isComplete ? (
          <span className="text-sm font-semibold">Ödeme Tamamlandı</span>
        ) : (
          <span className="text-sm font-semibold">
            {formatPaymentAmount(remainingBalance)} Ödenmemiş
          </span>
        )}
      </div>

      {/* İndirim Uygula Butonu */}
      {!discount && onApplyDiscount && (
        <button
          onClick={onApplyDiscount}
          className="w-full mt-2 py-2 text-xs font-semibold text-text-muted hover:text-primary-main 
            border border-dashed border-border-medium hover:border-primary-main rounded-sm
            transition-colors flex items-center justify-center gap-1"
        >
          <Minus className="h-3 w-3" />
          İndirim Uygula
        </button>
      )}

      {/* İndirim Kaldır (varsa) */}
      {discount > 0 && onApplyDiscount && (
        <button
          onClick={onApplyDiscount}
          className="w-full mt-2 py-2 text-xs font-semibold text-danger-main hover:text-danger-hover
            transition-colors"
        >
          İndirimi Kaldır
        </button>
      )}
    </div>
  );
}

// ============================================
// COMPACT VERSION - Daha küçük alan için
// ============================================

interface PaymentSummaryCompactProps {
  finalTotal: number;
  totalPaid: number;
  remainingBalance: number;
  isComplete: boolean;
}

export function PaymentSummaryCompact({
  finalTotal,
  totalPaid,
  remainingBalance,
  isComplete,
}: PaymentSummaryCompactProps) {
  const colors = {
    success: 'text-success-main',
    danger: 'text-danger-main',
    muted: 'text-text-muted',
  };

  return (
    <div className="flex items-center justify-between p-3 bg-bg-muted rounded-sm">
      <div className="text-xs text-text-muted">Kalan</div>
      <div className="flex items-center gap-2">
        {isComplete ? (
          <CheckCircle2 className="h-5 w-5 text-success-main" />
        ) : (
          <span className={`text-lg font-black ${remainingBalance > 0 ? colors.danger : colors.success}`}>
            {formatPaymentAmount(remainingBalance)}
          </span>
        )}
      </div>
    </div>
  );
}

// ============================================
// MINIMAL VERSION - Sadece kalan tutar
// ============================================

interface PaymentRemainingBadgeProps {
  remaining: number;
  isComplete: boolean;
}

export function PaymentRemainingBadge({ 
  remaining, 
  isComplete 
}: PaymentRemainingBadgeProps) {
  if (isComplete) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 bg-success-main/10 text-success-main text-xs font-bold rounded">
        <CheckCircle2 className="h-3 w-3" />
        ÖDENDİ
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 bg-danger-main/10 text-danger-main text-xs font-bold rounded">
      <AlertCircle className="h-3 w-3" />
      {formatPaymentAmount(remaining)}
    </span>
  );
}
