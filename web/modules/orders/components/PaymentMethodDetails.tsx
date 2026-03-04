'use client';

import { useState, useEffect } from 'react';
import { Wallet } from 'lucide-react';
import {
  MealVoucherType,
  MEAL_VOUCHER_TYPE_OPTIONS,
  PaymentMethod,
  PaymentLine,
} from '../types';
import { CustomerSelector } from './CustomerSelector';
import { Customer } from '@/modules/customers/services/customers.service';

// ============================================
// PAYMENT METHOD DETAILS - Dinamik İçerik Alanı
// Seçili ödeme yöntemine göre form gösterir
// Fade-in geçiş efekti + Para üstü (nakit) için büyük yeşil kutu
// ============================================

interface PaymentMethodDetailsProps {
  activePayment: PaymentLine | null;
  method: PaymentMethod | undefined;
  onUpdate: (updates: Partial<PaymentLine>) => void;
  restaurantId: string;
  disabled: boolean;
  onAddNewCustomer?: (name: string) => Promise<Customer | null>;
  onOpenNewCustomerModal?: (initialName?: string) => void;
  commissionRate?: number;
  tipEnabled?: boolean;
}

// Boş durum (Empty State)
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-64 text-text-muted">
      <Wallet className="h-12 w-12 mb-3 opacity-30" />
      <p className="text-sm">Ödeme yöntemi seçin</p>
      <p className="text-xs mt-1">Yukarıdan bir yöntem seçiniz</p>
    </div>
  );
}

// Nakit Ödeme Formu - Para Üstü büyük yeşil kutuda
function CashPaymentForm({
  payment,
  onUpdate,
  disabled,
}: {
  payment: PaymentLine;
  onUpdate: (updates: Partial<PaymentLine>) => void;
  disabled: boolean;
}) {
  const [localAmount, setLocalAmount] = useState(payment.amount.toString());

  // Payment değiştiğinde local state güncelle
  useEffect(() => {
    setLocalAmount(payment.amount.toString());
  }, [payment.amount]);

  const handleAmountChange = (value: string) => {
    setLocalAmount(value);
    const num = parseFloat(value.replace(',', '.')) || 0;
    onUpdate({ amount: num });
  };

  return (
    <div className="space-y-3">
      {/* Tutar Girişi */}
      <div>
        <label className="text-xs font-semibold text-text-secondary uppercase block mb-2">
          Ödeme Tutarı
        </label>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={localAmount}
            onChange={(e) => handleAmountChange(e.target.value)}
            disabled={disabled}
            className="flex-1 px-4 py-3 text-xl font-bold text-right bg-bg-muted border border-border-light rounded-sm
              focus:outline-none focus:border-primary-main"
            placeholder="0,00"
          />
          <span className="text-lg font-semibold text-text-muted">TL</span>
        </div>
      </div>
      <p className="text-[11px] text-text-muted">
        Nakit için sadece ödeme tutarı girilir.
      </p>
    </div>
  );
}

// Açık Hesap (Borç) Formu
function OpenAccountForm({
  payment,
  onUpdate,
  restaurantId,
  disabled,
  onAddNewCustomer,
  onOpenNewCustomerModal,
}: {
  payment: PaymentLine;
  onUpdate: (updates: Partial<PaymentLine>) => void;
  restaurantId: string;
  disabled: boolean;
  onAddNewCustomer?: (name: string) => Promise<Customer | null>;
  onOpenNewCustomerModal?: (initialName?: string) => void;
}) {
  const [localAmount, setLocalAmount] = useState(payment.amount.toString());

  useEffect(() => {
    setLocalAmount(payment.amount.toString());
  }, [payment.amount]);

  const handleAmountChange = (value: string) => {
    setLocalAmount(value);
    const num = parseFloat(value.replace(',', '.')) || 0;
    onUpdate({ amount: num });
  };

  return (
    <div className="space-y-4">
      {/* Tutar Girişi */}
      <div>
        <label className="text-xs font-semibold text-text-secondary uppercase block mb-2">
          Ödeme Tutarı
        </label>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={localAmount}
            onChange={(e) => handleAmountChange(e.target.value)}
            disabled={disabled}
            className="flex-1 px-4 py-3 text-xl font-bold text-right bg-bg-muted border border-border-light rounded-sm
              focus:outline-none focus:border-primary-main"
            placeholder="0,00"
          />
          <span className="text-lg font-semibold text-text-muted">TL</span>
        </div>
      </div>

      {/* Müşteri Seçici */}
      <div>
        <label className="text-xs font-semibold text-text-secondary uppercase block mb-2">
          Müşteri Seçin
        </label>
        <CustomerSelector
          restaurantId={restaurantId}
          value={payment.customerId ?? undefined}
          onChange={(customer) => {
            onUpdate({ customerId: customer?.id ?? null });
          }}
          onAddNew={onAddNewCustomer}
          onOpenNewCustomerModal={onOpenNewCustomerModal}
          disabled={disabled}
          placeholder="Müşteri ara..."
        />
      </div>
    </div>
  );
}

function MealVoucherPaymentForm({
  payment,
  onUpdate,
  disabled,
}: {
  payment: PaymentLine;
  onUpdate: (updates: Partial<PaymentLine>) => void;
  disabled: boolean;
}) {
  const [localAmount, setLocalAmount] = useState(payment.amount.toString());

  useEffect(() => {
    setLocalAmount(payment.amount.toString());
  }, [payment.amount]);

  const handleAmountChange = (value: string) => {
    setLocalAmount(value);
    const num = parseFloat(value.replace(',', '.')) || 0;
    onUpdate({ amount: num });
  };

  const handleVoucherTypeChange = (value: string) => {
    onUpdate({
      mealVoucherType: value
        ? (value as MealVoucherType)
        : null,
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs font-semibold text-text-secondary uppercase block mb-2">
          Ödeme Tutarı
        </label>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={localAmount}
            onChange={(e) => handleAmountChange(e.target.value)}
            disabled={disabled}
            className="flex-1 px-4 py-3 text-xl font-bold text-right bg-bg-muted border border-border-light rounded-sm
              focus:outline-none focus:border-primary-main"
            placeholder="0,00"
          />
          <span className="text-lg font-semibold text-text-muted">TL</span>
        </div>
      </div>

      <div>
        <label className="text-xs font-semibold text-text-secondary uppercase block mb-2">
          Çek Tipi
        </label>
        <select
          value={payment.mealVoucherType ?? ''}
          onChange={(e) => handleVoucherTypeChange(e.target.value)}
          disabled={disabled}
          className="w-full px-4 py-3 text-sm font-semibold bg-bg-muted border border-border-light rounded-sm
            focus:outline-none focus:border-primary-main text-text-primary"
        >
          <option value="">Çek tipi seçin</option>
          {MEAL_VOUCHER_TYPE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <p className="text-[11px] text-text-muted">
        Her yemek çeki ayrı bir ödeme satırı olarak girilir.
      </p>
    </div>
  );
}

// Kart ve Diğer Ödeme Yöntemleri Formu
function CardPaymentForm({
  payment,
  onUpdate,
  disabled,
  methodLabel,
  commissionRate = 0.02,
  tipEnabled = false,
}: {
  payment: PaymentLine;
  onUpdate: (updates: Partial<PaymentLine>) => void;
  disabled: boolean;
  methodLabel: string;
  commissionRate?: number;
  tipEnabled?: boolean;
}) {
  const [localAmount, setLocalAmount] = useState(payment.amount.toString());
  const [localTip, setLocalTip] = useState((payment.tipAmount || 0).toString());

  useEffect(() => {
    setLocalAmount(payment.amount.toString());
  }, [payment.amount]);

  useEffect(() => {
    setLocalTip((payment.tipAmount || 0).toString());
  }, [payment.tipAmount]);

  const handleAmountChange = (value: string) => {
    setLocalAmount(value);
    const num = parseFloat(value.replace(',', '.')) || 0;
    onUpdate({ amount: num });
  };

  const handleTipChange = (value: string) => {
    setLocalTip(value);
    const num = parseFloat(value.replace(',', '.')) || 0;
    onUpdate({ tipAmount: num });
  };

  const tip = parseFloat(localTip.replace(',', '.')) || 0;
  const comm = typeof payment.commissionRate === 'number'
    ? payment.commissionRate
    : commissionRate;
  const netTip = tip * (1 - comm);

  return (
    <div className="space-y-4">
      {/* Tutar Girişi */}
      <div>
        <label className="text-xs font-semibold text-text-secondary uppercase block mb-2">
          {methodLabel} Tutarı
        </label>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={localAmount}
            onChange={(e) => handleAmountChange(e.target.value)}
            disabled={disabled}
            className="flex-1 px-4 py-3 text-xl font-bold text-right bg-bg-muted border border-border-light rounded-sm
              focus:outline-none focus:border-primary-main"
            placeholder="0,00"
          />
          <span className="text-lg font-semibold text-text-muted">TL</span>
        </div>
      </div>

      {tipEnabled && (
        <>
          {/* Bahşiş Bölümü */}
          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border-light">
            <div>
              <label className="text-[10px] font-semibold text-text-secondary uppercase block mb-1">
                Bahşiş (Tip)
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={localTip}
                  onChange={(e) => handleTipChange(e.target.value)}
                  disabled={disabled}
                  className="flex-1 px-3 py-2 text-base font-bold text-right bg-bg-muted border border-border-light rounded-sm
                    focus:outline-none focus:border-primary-main"
                  placeholder="0,00"
                />
                <span className="text-sm font-semibold text-text-muted">TL</span>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-semibold text-text-secondary uppercase block mb-1">
                Komisyon Oranı
              </label>
              <div className="flex items-center gap-1.5">
                <div
                  className="flex-1 px-3 py-2 text-base font-bold text-right bg-bg-muted border border-border-light rounded-sm text-text-primary"
                  aria-label="Komisyon oranı bilgisi"
                >
                  %{(comm * 100).toFixed(2)}
                </div>
              </div>
            </div>
          </div>

          {tip > 0 && (
            <div className="p-3 bg-bg-muted border border-border-light rounded-sm flex justify-between items-center">
              <span className="text-xs font-semibold text-text-secondary uppercase">Net Bahşiş:</span>
              <span className="text-sm font-bold text-success-main">₺{netTip.toFixed(2)}</span>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// Ana Bileşen
export function PaymentMethodDetails({
  activePayment,
  method,
  onUpdate,
  restaurantId, // If needed in future
  disabled,
  onAddNewCustomer,
  onOpenNewCustomerModal,
  commissionRate,
  tipEnabled,
}: PaymentMethodDetailsProps) {
  // Boş durum
  if (!method || !activePayment) {
    return <EmptyState />;
  }

  // Method'a göre form göster - CSS transition ile fade-in efekti
  return (
    <div className="transition-all duration-200 ease-out">
      {method === PaymentMethod.CASH && (
        <CashPaymentForm
          payment={activePayment}
          onUpdate={onUpdate}
          disabled={disabled}
        />
      )}

      {method === PaymentMethod.OPEN_ACCOUNT && (
        <OpenAccountForm
          payment={activePayment}
          onUpdate={onUpdate}
          restaurantId={restaurantId || ''}
          disabled={disabled}
          onAddNewCustomer={onAddNewCustomer}
          onOpenNewCustomerModal={onOpenNewCustomerModal}
        />
      )}

      {(method === PaymentMethod.CREDIT_CARD ||
        method === PaymentMethod.DEBIT_CARD) && (
          <CardPaymentForm
            payment={activePayment}
            onUpdate={onUpdate}
            disabled={disabled}
            methodLabel={method === PaymentMethod.CREDIT_CARD ? 'Kredi Kartı' : 'Banka Kartı'}
            commissionRate={commissionRate}
            tipEnabled={tipEnabled}
          />
        )}

      {method === PaymentMethod.DIGITAL_WALLET && (
        <CardPaymentForm
          payment={activePayment}
          onUpdate={onUpdate}
          disabled={disabled}
          methodLabel="Dijital Cüzdan"
          commissionRate={commissionRate}
          tipEnabled={tipEnabled}
        />
      )}

      {method === PaymentMethod.BANK_TRANSFER && (
        <CardPaymentForm
          payment={activePayment}
          onUpdate={onUpdate}
          disabled={disabled}
          methodLabel="Havale"
          commissionRate={commissionRate}
          tipEnabled={tipEnabled}
        />
      )}

      {method === PaymentMethod.MEAL_VOUCHER && (
        <MealVoucherPaymentForm
          payment={activePayment}
          onUpdate={onUpdate}
          disabled={disabled}
        />
      )}
    </div>
  );
}
