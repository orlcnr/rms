'use client';

import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import {
  Discount,
  PaymentLine,
  PAYMENT_METHOD_LABELS,
  formatPaymentAmount,
} from '../types';

interface ChangeConfirmationDialogProps {
  netAmount: number;
  payments: PaymentLine[];
  discount?: Discount | null;
  totalTipAmount?: number;
  totalPaidAmount?: number;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ChangeConfirmationDialog({
  netAmount = 0,
  payments,
  discount,
  totalTipAmount = 0,
  totalPaidAmount = 0,
  onConfirm,
  onCancel,
}: ChangeConfirmationDialogProps) {
  const paymentLines = payments.filter((payment) => payment.amount > 0);
  const netCollectedAmount = Number(totalPaidAmount) - Number(totalTipAmount);
  const diffAmount = Number(netCollectedAmount) - Number(netAmount);
  const hasMismatch = Math.abs(diffAmount) > 0.01;
  const isOverCollected = diffAmount > 0;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* Dialog */}
      <div className="relative bg-bg-surface w-full max-w-xl mx-4 p-6 rounded-sm shadow-xl">
        {/* Icon */}
        <div className="w-14 h-14 mx-auto mb-4 rounded-full flex items-center justify-center bg-primary-main/10">
          <CheckCircle2 className="h-7 w-7 text-primary-main" />
        </div>

        <h3 className="text-xl font-black text-text-primary text-center mb-4">
          ÖDEME ÖZETİ ONAYI
        </h3>

        <div className="space-y-3 mb-5">
          <div className="rounded-sm border border-border-light bg-bg-muted p-3">
            <p className="text-xs font-black text-text-muted uppercase tracking-wider mb-2">
              Kullanılan Ödeme Yöntemleri
            </p>
            {paymentLines.length === 0 ? (
              <p className="text-sm text-text-muted">Ödeme satırı bulunamadı.</p>
            ) : (
              <div className="space-y-1.5">
                {paymentLines.map((payment) => (
                  <div
                    key={payment.id}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-text-secondary font-semibold">
                      {PAYMENT_METHOD_LABELS[payment.method]}
                    </span>
                    <span className="text-text-primary font-bold">
                      {formatPaymentAmount(payment.amount)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-sm border border-border-light bg-bg-muted p-3 space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-text-muted">Net Tutar</span>
              <span className="font-bold text-text-primary">
                {formatPaymentAmount(netAmount)}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-text-muted">Toplam Ödeme</span>
              <span className="font-bold text-text-primary">
                {formatPaymentAmount(totalPaidAmount)}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-text-muted">Toplam Bahşiş</span>
              <span
                className={`font-bold ${
                  totalTipAmount > 0 ? 'text-success-main' : 'text-text-muted'
                }`}
              >
                {formatPaymentAmount(totalTipAmount)}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm border-t border-border-light pt-2">
              <span className="text-text-muted">Alınan (Ödeme - Bahşiş)</span>
              <span className="font-black text-text-primary">
                {formatPaymentAmount(netCollectedAmount)}
              </span>
            </div>
          </div>

          {discount && discount.amount > 0 && (
            <div className="rounded-sm border border-success-main/30 bg-success-main/10 p-3">
              <p className="text-xs font-black text-success-main uppercase tracking-wider mb-1">
                Uygulanan {discount.type === 'complimentary' ? 'İkram' : 'İndirim'}
              </p>
              <div className="flex items-center justify-between text-sm">
                <span className="text-text-secondary">Tutar</span>
                <span className="font-black text-success-main">
                  -{formatPaymentAmount(discount.amount)}
                </span>
              </div>
              {discount.reason ? (
                <p className="text-xs text-text-muted mt-1">
                  Sebep: {discount.reason}
                </p>
              ) : null}
            </div>
          )}

          {hasMismatch && (
            <div className="rounded-sm border border-warning-main/40 bg-warning-bg p-3">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="h-4 w-4 text-warning-main" />
                <p className="text-xs font-black text-warning-main uppercase tracking-wider">
                  Tutar Uyuşmazlığı
                </p>
              </div>
              <p className="text-sm text-text-secondary">
                Net tutara göre {formatPaymentAmount(Math.abs(diffAmount))}{' '}
                {isOverCollected ? 'fazla' : 'eksik'} tahsilat görünüyor.
              </p>
            </div>
          )}
        </div>

        <p className="text-xs text-text-muted text-center mb-5">
          Ödemeyi tamamlamadan önce bu özeti kontrol edin.
        </p>

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
            ONAYLA VE ÖDEME AL
          </button>
        </div>
      </div>
    </div>
  );
}
