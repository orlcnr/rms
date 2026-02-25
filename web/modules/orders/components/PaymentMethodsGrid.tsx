'use client';

import {
  Banknote,
  CreditCard,
  Smartphone,
  Building,
  User,
  LucideIcon,
} from 'lucide-react';
import { PaymentMethod } from '../types';

// ============================================
// PAYMENT METHODS GRID - 4'lü Grid Düzeni
// Kompakt butonlar, seçili durumda border-l-4 efekti
// ============================================

interface PaymentMethodsGridProps {
  selectedMethod?: PaymentMethod;
  onSelectMethod: (method: PaymentMethod) => void;
  disabled?: boolean;
}

// Method ikonlarını getir
const getMethodIcon = (method: PaymentMethod): LucideIcon => {
  switch (method) {
    case PaymentMethod.CASH:
      return Banknote;
    case PaymentMethod.CREDIT_CARD:
    case PaymentMethod.DEBIT_CARD:
      return CreditCard;
    case PaymentMethod.DIGITAL_WALLET:
      return Smartphone;
    case PaymentMethod.BANK_TRANSFER:
      return Building;
    case PaymentMethod.OPEN_ACCOUNT:
      return User;
    default:
      return CreditCard;
  }
};

// Method etiketlerini getir
const getMethodLabel = (method: PaymentMethod): string => {
  switch (method) {
    case PaymentMethod.CASH:
      return 'Nakit';
    case PaymentMethod.CREDIT_CARD:
      return 'Kredi Kartı';
    case PaymentMethod.DEBIT_CARD:
      return 'Banka Kartı';
    case PaymentMethod.DIGITAL_WALLET:
      return 'Dijital Cüzdan';
    case PaymentMethod.BANK_TRANSFER:
      return 'Havale';
    case PaymentMethod.OPEN_ACCOUNT:
      return 'Açık Hesap';
    default:
      return method;
  }
};

export function PaymentMethodsGrid({
  selectedMethod,
  onSelectMethod,
  disabled,
}: PaymentMethodsGridProps) {
  return (
    <div className="p-4 border-b border-border-light">
      <h4 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-3">
        Ödeme Yöntemi Ekle
      </h4>
      <div className="grid grid-cols-4 gap-2">
        {Object.values(PaymentMethod).map((method) => {
          const Icon = getMethodIcon(method);
          const isSelected = selectedMethod === method;

          return (
            <button
              key={method}
              onClick={() => onSelectMethod(method)}
              disabled={disabled}
              className={`
                flex items-center gap-2 px-3 py-2.5 rounded-sm transition-all duration-200
                ${
                  isSelected
                    ? 'bg-primary-main/10 border border-primary-main/30 border-l-4 border-l-primary-main text-primary-main'
                    : 'bg-bg-muted border border-border-light hover:border-primary-main/50 text-text-primary'
                }
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              <span className="text-xs font-medium truncate">
                {getMethodLabel(method)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
