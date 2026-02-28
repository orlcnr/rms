'use client';

import { useState, useMemo } from 'react';
import { X } from 'lucide-react';
import { formatPaymentAmount } from '../types';

interface DiscountDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (type: 'discount' | 'complimentary', amount: number, reason: string) => void;
  orderTotal: number;
}

export function DiscountDialog({
  isOpen,
  onClose,
  onConfirm,
  orderTotal,
}: DiscountDialogProps) {
  const [discountType, setDiscountType] = useState<'discount' | 'complimentary'>('discount');
  const [amount, setAmount] = useState('');
  const [isPercentage, setIsPercentage] = useState(false);
  const [reason, setReason] = useState('');

  // Calculate the actual amount based on percentage or fixed value
  const calculatedAmount = useMemo(() => {
    const numAmount = parseFloat(amount.replace(',', '.')) || 0;
    if (isPercentage) {
      return (orderTotal * numAmount) / 100;
    }
    return numAmount;
  }, [amount, isPercentage, orderTotal]);

  const handleConfirm = () => {
    if (calculatedAmount <= 0) return;
    onConfirm(discountType, calculatedAmount, reason);
    // Reset form
    setAmount('');
    setReason('');
    setIsPercentage(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="relative bg-bg-surface w-full max-w-md mx-4 p-6 rounded-sm shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-black text-text-primary">
            İndirim Uygula
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-bg-muted rounded-sm transition-colors"
          >
            <X className="h-5 w-5 text-text-secondary" />
          </button>
        </div>

        {/* Discount Type */}
        <div className="mb-4">
          <label className="text-sm font-semibold text-text-secondary block mb-2">
            İndirim Türü
          </label>
          <div className="flex gap-3">
            <button
              onClick={() => setDiscountType('discount')}
              className={`flex-1 py-3 px-4 rounded-sm font-semibold transition-colors ${
                discountType === 'discount'
                  ? 'bg-primary-main text-white'
                  : 'bg-bg-muted text-text-secondary hover:bg-border-light'
              }`}
            >
              İskonto
            </button>
            <button
              onClick={() => setDiscountType('complimentary')}
              className={`flex-1 py-3 px-4 rounded-sm font-semibold transition-colors ${
                discountType === 'complimentary'
                  ? 'bg-primary-main text-white'
                  : 'bg-bg-muted text-text-secondary hover:bg-border-light'
              }`}
            >
              İkram
            </button>
          </div>
        </div>

        {/* Amount */}
        <div className="mb-4">
          <label className="text-sm font-semibold text-text-secondary block mb-2">
            İndirim Tutarı
          </label>
          <div className="flex gap-2">
            <div className="flex-1">
              <input
                type="text"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-4 py-3 text-lg font-bold text-right bg-bg-muted border border-border-light rounded-sm
                  focus:outline-none focus:border-primary-main"
                placeholder="0,00"
              />
            </div>
            <button
              onClick={() => setIsPercentage(!isPercentage)}
              className={`px-4 py-3 rounded-sm font-semibold transition-colors ${
                isPercentage
                  ? 'bg-primary-main text-white'
                  : 'bg-bg-muted text-text-secondary hover:bg-border-light'
              }`}
            >
              %
            </button>
          </div>
          {calculatedAmount > 0 && (
            <p className="text-sm text-text-muted mt-2">
              = {formatPaymentAmount(calculatedAmount)}
            </p>
          )}
        </div>

        {/* Reason */}
        <div className="mb-6">
          <label className="text-sm font-semibold text-text-secondary block mb-2">
            Sebep (Opsiyonel)
          </label>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full px-4 py-3 bg-bg-muted border border-border-light rounded-sm
              focus:outline-none focus:border-primary-main"
            placeholder="örn: Doğum günü, Bayram indirimi..."
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 px-4 bg-bg-muted text-text-primary font-bold rounded-sm
              hover:bg-border-light transition-colors"
          >
            İPTAL
          </button>
          <button
            onClick={handleConfirm}
            disabled={calculatedAmount <= 0}
            className="flex-1 py-3 px-4 bg-success-main text-white font-bold rounded-sm
              hover:bg-success-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            UYGULA
          </button>
        </div>
      </div>
    </div>
  );
}
