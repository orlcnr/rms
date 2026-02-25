'use client';

import { formatPaymentAmount } from '../types';

// ============================================
// PAYMENT STATUS BAR - Üst Bilgi Çubuğu
// Modal header'ın hemen altında: Toplam | Kalan | İndirim
// ============================================

interface PaymentStatusBarProps {
  finalTotal: number;
  remainingBalance: number;
  discount?: number;
  isComplete: boolean;
}

export function PaymentStatusBar({
  finalTotal,
  remainingBalance,
  discount,
  isComplete,
}: PaymentStatusBarProps) {
  return (
    <div className="flex items-center gap-6 px-4 py-3 bg-bg-muted border-b border-border-light">
      {/* Toplam */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">
          Toplam
        </span>
        <span className="text-base font-black text-text-primary">
          ₺{formatPaymentAmount(finalTotal)}
        </span>
      </div>

      {/* Divider */}
      <div className="w-px h-5 bg-border-light" />

      {/* Kalan */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">
          Kalan
        </span>
        <span
          className={`text-base font-black ${
            isComplete ? 'text-success-main' : 'text-danger-main'
          }`}
        >
          {isComplete ? '0,00' : `₺${formatPaymentAmount(remainingBalance)}`}
        </span>
      </div>

      {/* Divider */}
      <div className="w-px h-5 bg-border-light" />

      {/* İndirim */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">
          İndirim
        </span>
        <span className="text-base font-black text-success-main">
          {discount && discount > 0
            ? `-₺${formatPaymentAmount(discount)}`
            : '-'}
        </span>
      </div>
    </div>
  );
}
