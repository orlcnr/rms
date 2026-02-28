'use client';

import { useState } from 'react';
import { X, Trash2 } from 'lucide-react';
import { usePayment } from '../hooks/usePayment';
import { PaymentMethod, formatPaymentAmount } from '../types';
import { PaymentSummaryCard } from './PaymentSummaryCard';
import { CustomerSelector } from './CustomerSelector';
import { QuickNumPad } from './QuickNumPad';
import { Customer } from '@/modules/customers/services/customers.service';

interface MobilePaymentSheetProps {
  hook: ReturnType<typeof usePayment>;
  orderTotal: number;
  restaurantId: string;
  onClose: () => void;
  getMethodIcon: (method: PaymentMethod) => any;
  handleComplete: () => void;
  onAddNewCustomer?: (name: string) => Promise<Customer | null>;
  isCreatingCustomer?: boolean;
}

export function MobilePaymentSheet({
  hook,
  orderTotal,
  restaurantId,
  onClose,
  getMethodIcon,
  handleComplete,
  onAddNewCustomer,
  isCreatingCustomer,
}: MobilePaymentSheetProps) {
  const [showNumpad, setShowNumpad] = useState(false);

  // Get method label helper
  const getMethodLabel = (method: string) => {
    switch (method) {
      case 'cash':
        return 'Nakit';
      case 'credit_card':
        return 'Kart';
      case 'debit_card':
        return 'Banka Kartı';
      case 'digital_wallet':
        return 'Dijital Cüzdan';
      case 'bank_transfer':
        return 'Havale/EFT';
      case 'open_account':
        return 'Cari';
      default:
        return method;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-bg-app flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-bg-surface border-b border-border-light">
        <button onClick={onClose} className="p-2 -ml-2">
          <X className="h-6 w-6 text-text-secondary" />
        </button>
        <h2 className="text-base font-bold text-text-primary">Ödeme Al</h2>
        <div className="w-10" />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Summary */}
        <PaymentSummaryCard
          subtotal={hook.serverOrderTotal || orderTotal}
          discount={hook.discount?.amount}
          discountType={hook.discount?.type as 'discount' | 'complimentary'}
          finalTotal={hook.finalTotal}
          totalPaid={hook.totalPaid}
          remainingBalance={hook.remainingBalance}
          totalChange={hook.totalChange}
          isComplete={hook.canCompletePayment}
          isProcessing={hook.isProcessing}
        />

        {/* Quick Add Buttons */}
        <div className="grid grid-cols-3 gap-2">
          {Object.values(PaymentMethod).slice(0, 6).map((method) => {
            const Icon = getMethodIcon(method);
            return (
              <button
                key={method}
                onClick={() => {
                  hook.addPaymentLine(method);
                  setShowNumpad(true);
                }}
                disabled={hook.isProcessing}
                className="flex flex-col items-center gap-1 p-3 bg-bg-surface border border-border-light rounded-sm"
              >
                <Icon className="h-5 w-5 text-primary-main" />
                <span className="text-xs">{getMethodLabel(method)}</span>
              </button>
            );
          })}
        </div>

        {/* Payment Lines */}
        {hook.payments.map((payment, index) => (
          <div
            key={payment.id}
            className="flex items-center justify-between p-3 bg-bg-surface border border-border-light rounded-sm"
          >
            <div>
              <span className="text-sm font-medium">{getMethodLabel(payment.method)}</span>
              <span className="text-lg font-bold ml-2">{formatPaymentAmount(payment.amount)}</span>
            </div>
            <button
              onClick={() => hook.removePaymentLine(payment.id)}
              className="p-2 text-danger-main"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}

        {/* Active Payment Edit */}
        {hook.activePaymentIndex !== null && hook.payments[hook.activePaymentIndex] && (
          <div className="p-4 bg-primary-main/5 border border-primary-main rounded-sm">
            <p className="text-xs text-primary-main mb-2">
              {hook.payments[hook.activePaymentIndex].method} için tutar girin
            </p>

            {/* Quick NumPad */}
            <QuickNumPad
              value={hook.numericPadValue.display}
              onDigit={(d) => hook.appendDigit(d)}
              onDelete={hook.deleteLastDigit}
              onClear={hook.clearNumericPad}
              onConfirm={() => {
                hook.applyNumericPadToActivePayment();
                setShowNumpad(false);
              }}
            />

            {/* Customer Selector for Open Account */}
            {hook.activePaymentIndex !== null &&
              hook.payments[hook.activePaymentIndex]?.method === PaymentMethod.OPEN_ACCOUNT && (
                <div className="mt-3">
                  <CustomerSelector
                    restaurantId={restaurantId}
                    value={hook.payments[hook.activePaymentIndex]?.customerId}
                    onChange={(customer) => {
                      const idx = hook.activePaymentIndex;
                      const payment = idx !== null ? hook.payments[idx] : null;
                      if (payment) {
                        hook.updatePaymentLine(payment.id, {
                          customerId: customer?.id,
                        });
                      }
                    }}
                    onAddNew={onAddNewCustomer}
                    disabled={isCreatingCustomer}
                  />
                </div>
              )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-4 bg-bg-surface border-t border-border-light">
        <button
          onClick={handleComplete}
          disabled={!hook.canCompletePayment || hook.isProcessing}
          className={`
            w-full py-4 text-base font-bold rounded-sm
            ${
              hook.canCompletePayment && !hook.isProcessing
                ? 'bg-success-main text-white'
                : 'bg-bg-muted text-text-muted'
            }
          `}
        >
          {hook.isProcessing ? 'İşleniyor...' : 'Ödemeyi Tamamla'}
        </button>
      </div>
    </div>
  );
}
