'use client';

import { Banknote } from 'lucide-react';
import { formatPaymentAmount } from '../types';

interface ChangeConfirmationDialogProps {
  changeAmount: number;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ChangeConfirmationDialog({
  changeAmount,
  onConfirm,
  onCancel,
}: ChangeConfirmationDialogProps) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* Dialog */}
      <div className="relative bg-bg-surface w-full max-w-sm mx-4 p-6 rounded-sm shadow-xl text-center">
        {/* Icon */}
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-success-main/10 flex items-center justify-center">
          <Banknote className="h-8 w-8 text-success-main" />
        </div>

        {/* Title */}
        <h3 className="text-xl font-black text-text-primary mb-2">NAKİT ÜSTÜ</h3>

        {/* Amount */}
        <p className="text-4xl font-black text-success-main mb-6">
          {formatPaymentAmount(changeAmount)}
        </p>

        {/* Message */}
        <p className="text-sm text-text-secondary mb-6">
          Müşteriye {formatPaymentAmount(changeAmount)} para üstü verilecek.
        </p>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3 px-4 bg-bg-muted text-text-primary font-bold rounded-sm
              hover:bg-border-light transition-colors"
          >
            İPTAL
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-3 px-4 bg-success-main text-white font-bold rounded-sm
              hover:bg-success-hover transition-colors"
          >
            ONAYLA
          </button>
        </div>
      </div>
    </div>
  );
}
