'use client';

import { Trash2 } from 'lucide-react';
import {
  getMealVoucherTypeLabel,
  getPaymentMethodLabel,
  PaymentLine,
  PaymentMethod,
  formatPaymentAmount,
} from '../types';

interface PaymentLineItemProps {
  payment: PaymentLine;
  methodSequence: number;
  isActive: boolean;
  onActivate: () => void;
  onRemove: () => void;
  disabled: boolean;
}

export function PaymentLineItem({
  payment,
  methodSequence,
  isActive,
  onActivate,
  onRemove,
  disabled,
}: PaymentLineItemProps) {
  const voucherTypeLabel = getMealVoucherTypeLabel(payment.mealVoucherType);

  return (
    <div
      onClick={onActivate}
      className={`
        p-4 border rounded-sm transition-all cursor-pointer
        ${
          isActive
            ? 'border-primary-main bg-primary-main/5'
            : 'border-border-light bg-bg-surface hover:border-border-medium'
        }
      `}
    >
      <div className="flex items-start justify-between gap-4">
        {/* Method & Amount (Read-only summary, edit on right panel) */}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold text-text-secondary uppercase">
              {getPaymentMethodLabel(payment.method as PaymentMethod)} #{methodSequence}
            </span>
            {isActive && (
              <span className="text-[10px] text-primary-main font-bold uppercase">Seçili</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-black text-text-primary tabular-nums">
              {formatPaymentAmount(payment.amount)}
            </span>
            <span className="text-xs font-semibold text-text-muted uppercase">TL</span>
          </div>
          <p className="mt-1 text-[10px] text-text-muted uppercase tracking-wider">
            Düzenleme sağ panelden yapılır
          </p>
          {payment.method === PaymentMethod.MEAL_VOUCHER && voucherTypeLabel && (
            <p className="mt-1 text-[10px] font-semibold text-text-muted uppercase tracking-wider">
              Çek Tipi: {voucherTypeLabel}
            </p>
          )}
        </div>

        {/* Remove Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          disabled={disabled}
          className="p-2 text-text-muted hover:text-danger-main hover:bg-danger-main/10 rounded-sm transition-colors
            disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
