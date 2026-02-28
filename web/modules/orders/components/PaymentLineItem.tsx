'use client';

import { useState, useEffect } from 'react';
import { Trash2 } from 'lucide-react';
import { PaymentLine, PaymentMethod, formatPaymentAmount } from '../types';
import { CustomerSelector } from './CustomerSelector';
import { Customer } from '@/modules/customers/services/customers.service';

interface PaymentLineItemProps {
  payment: PaymentLine;
  isActive: boolean;
  onActivate: () => void;
  onUpdate: (updates: Partial<PaymentLine>) => void;
  onRemove: () => void;
  restaurantId: string;
  disabled: boolean;
  onAddNewCustomer?: (name: string) => Promise<Customer | null>;
  isCreatingCustomer?: boolean;
}

export function PaymentLineItem({
  payment,
  isActive,
  onActivate,
  onUpdate,
  onRemove,
  restaurantId,
  disabled,
  onAddNewCustomer,
  isCreatingCustomer,
}: PaymentLineItemProps) {
  // Initialize with empty string if amount is 0, otherwise use amount
  const [localAmount, setLocalAmount] = useState(
    payment.amount > 0 ? payment.amount.toString() : ''
  );

  // Sync localAmount when payment.amount changes externally
  useEffect(() => {
    setLocalAmount(payment.amount > 0 ? payment.amount.toString() : '');
  }, [payment.amount]);

  // Handle local change without updating parent immediately
  const handleAmountChange = (value: string) => {
    setLocalAmount(value);
  };

  // Update parent on blur
  const handleAmountBlur = () => {
    const num = parseFloat(localAmount.replace(',', '.')) || 0;
    onUpdate({ amount: num });
  };

  // Get method label
  const getMethodLabel = (method: string) => {
    switch (method) {
      case 'cash':
        return 'Nakit';
      case 'credit_card':
        return 'Kredi Kartı';
      case 'debit_card':
        return 'Banka Kartı';
      case 'digital_wallet':
        return 'Dijital Cüzdan';
      case 'bank_transfer':
        return 'Havale/EFT';
      case 'open_account':
        return 'Açık Hesap';
      default:
        return method;
    }
  };

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
        {/* Method & Amount */}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-semibold text-text-secondary uppercase">
              {getMethodLabel(payment.method)}
            </span>
            {isActive && (
              <span className="text-xs text-primary-main">Düzenleniyor</span>
            )}
          </div>

          {/* Amount Input */}
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={localAmount}
              onChange={(e) => handleAmountChange(e.target.value)}
              onBlur={handleAmountBlur}
              onFocus={(e) => e.target.select()}
              disabled={disabled}
              className="w-32 px-3 py-2 text-xl font-bold text-right bg-bg-muted border border-border-light rounded-sm
                focus:outline-none focus:border-primary-main"
              placeholder="0,00"
            />
            <span className="text-sm font-semibold text-text-muted">TL</span>
          </div>
        </div>

        {/* Customer Selector (for Open Account) */}
        {payment.method === PaymentMethod.OPEN_ACCOUNT && isActive && (
          <div className="w-full mt-3">
            <CustomerSelector
              restaurantId={restaurantId}
              value={payment.customerId}
              onChange={(customer) => {
                onUpdate({ customerId: customer?.id });
              }}
              onAddNew={onAddNewCustomer}
              disabled={disabled || isCreatingCustomer}
            />
          </div>
        )}

        {/* Cash Received (for Cash) */}
        {payment.method === PaymentMethod.CASH && isActive && (
          <div className="w-full mt-3">
            <label className="text-xs font-semibold text-text-secondary uppercase block mb-1">
              Alınan Tutar
            </label>
            <input
              type="text"
              value={(payment.cashReceived || 0).toString()}
              onChange={(e) => {
                const val = parseFloat(e.target.value.replace(',', '.')) || 0;
                onUpdate({ cashReceived: val });
              }}
              disabled={disabled}
              className="w-full px-3 py-2 text-lg font-bold text-right bg-bg-muted border border-border-light rounded-sm
                focus:outline-none focus:border-primary-main"
              placeholder="0,00"
            />
            {(payment.cashReceived || 0) > payment.amount && (
              <p className="text-xs text-success-main mt-1">
                Para üstü: {formatPaymentAmount((payment.cashReceived || 0) - payment.amount)}
              </p>
            )}
          </div>
        )}

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
