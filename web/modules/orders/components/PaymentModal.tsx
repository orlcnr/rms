'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  X, 
  Plus, 
  Trash2, 
  CreditCard, 
  Banknote, 
  Smartphone, 
  Building, 
  User,
  Check,
  Calculator,
  Loader2,
} from 'lucide-react';
import { usePayment } from '../hooks/usePayment';
import { PaymentMethod, formatPaymentAmount, PaymentLine } from '../types';
import { CustomerSelector } from './CustomerSelector';
import { PaymentSummaryCard } from './PaymentSummaryCard';
import { cn } from '@/modules/shared/utils/cn';

// ============================================
// PAYMENT MODAL - Ana Ödeme Ekranı
// Desktop: Modal | Mobile: Bottom Sheet
// ============================================

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  orderTotal: number;
  restaurantId: string;
  onSuccess?: () => void;
}

export function PaymentModal({
  isOpen,
  onClose,
  orderId,
  orderTotal,
  restaurantId,
  onSuccess,
}: PaymentModalProps) {
  // Hook for payment logic
  const hook = usePayment({
    orderId,
    orderTotal,
    restaurantId,
    onSuccess: () => {
      onSuccess?.();
      onClose();
    },
  });

  // State for change confirmation
  const [showChangeConfirm, setShowChangeConfirm] = useState(false);

  // Mobile detection
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => {
      setIsMobile(typeof window !== 'undefined' && window.innerWidth < 768);
    };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Payment method icons
  const getMethodIcon = (method: PaymentMethod) => {
    switch (method) {
      case PaymentMethod.CASH: return Banknote;
      case PaymentMethod.CREDIT_CARD: 
      case PaymentMethod.DEBIT_CARD: return CreditCard;
      case PaymentMethod.DIGITAL_WALLET: return Smartphone;
      case PaymentMethod.BANK_TRANSFER: return Building;
      case PaymentMethod.OPEN_ACCOUNT: return User;
      default: return CreditCard;
    }
  };

  // Handle successful payment
  const handleComplete = async () => {
    // Nakit üstü varsa onay al
    if (hook.totalChange > 0 && !showChangeConfirm) {
      setShowChangeConfirm(true);
      return;
    }
    
    setShowChangeConfirm(false);
    await hook.completePayment();
  };

  // Nakit üstü var mı?
  const hasChange = hook.totalChange > 0;

  if (!isOpen) return null;

  return (
    <>
      {/* Desktop Modal */}
      {!isMobile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />
          
          {/* Modal Content */}
          <div className="relative bg-bg-surface w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-sm shadow-xl flex flex-col">
            {/* Header */}
            <PaymentModalHeader 
              title="Ödeme Al" 
              onClose={onClose}
              isProcessing={hook.isProcessing}
            />

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6">
              <PaymentSummaryCard
                subtotal={hook.serverOrderTotal || orderTotal}
                discount={hook.discount?.amount}
                discountType={hook.discount?.type as 'discount' | 'complimentary'}
                discountReason={hook.discount?.reason}
                finalTotal={hook.finalTotal}
                totalPaid={hook.totalPaid}
                remainingBalance={hook.remainingBalance}
                totalChange={hook.totalChange}
                isComplete={hook.canCompletePayment}
                isProcessing={hook.isProcessing}
                onApplyDiscount={() => {}}
              />

              {/* Payment Methods */}
              <div className="mt-6">
                <h4 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-3">
                  Ödeme Yöntemi Ekle
                </h4>
                <div className="grid grid-cols-3 gap-2">
                  {Object.values(PaymentMethod).map((method) => {
                    const Icon = getMethodIcon(method);
                    return (
                      <button
                        key={method}
                        onClick={() => hook.addPaymentLine(method)}
                        disabled={hook.isProcessing}
                        className="flex flex-col items-center gap-2 p-4 bg-bg-muted hover:bg-bg-hover 
                          border border-border-light hover:border-primary-main rounded-sm transition-colors
                          disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Icon className="h-6 w-6 text-primary-main" />
                        <span className="text-xs font-medium text-text-primary">
                          {method === 'cash' ? 'Nakit' : 
                           method === 'credit_card' ? 'Kredi Kartı' :
                           method === 'debit_card' ? 'Banka Kartı' :
                           method === 'digital_wallet' ? 'Dijital Cüzdan' :
                           method === 'bank_transfer' ? 'Havale' : 'Açık Hesap'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Payment Lines */}
              <div className="mt-6 space-y-3">
                <h4 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-3">
                  Ödeme Satırları
                </h4>
                {hook.payments.length === 0 ? (
                  <div className="text-center py-8 text-text-muted">
                    <Calculator className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Henüz ödeme eklenmedi</p>
                    <p className="text-xs">Yukarıdan bir ödeme yöntemi seçin</p>
                  </div>
                ) : (
                  hook.payments.map((payment, index) => (
                    <PaymentLineItem
                      key={payment.id}
                      payment={payment}
                      isActive={hook.activePaymentIndex === index}
                      onActivate={() => hook.setActivePaymentIndex(index)}
                      onUpdate={(updates) => hook.updatePaymentLine(payment.id, updates)}
                      onRemove={() => hook.removePaymentLine(payment.id)}
                      restaurantId={restaurantId}
                      disabled={hook.isProcessing}
                    />
                  ))
                )}
              </div>
            </div>

            {/* Footer */}
            <PaymentModalFooter
              canComplete={hook.canCompletePayment}
              isProcessing={hook.isProcessing}
              onComplete={handleComplete}
              error={hook.error}
            />
          </div>
        </div>
      )}

      {/* Mobile Bottom Sheet */}
      {isMobile && (
        <MobilePaymentSheet
          hook={hook}
          orderTotal={hook.serverOrderTotal || orderTotal}
          restaurantId={restaurantId}
          onClose={onClose}
          getMethodIcon={getMethodIcon}
          handleComplete={handleComplete}
        />
      )}
    </>
  );
}

// ============================================
// SUB-COMPONENTS
// ============================================

function PaymentModalHeader({ 
  title, 
  onClose,
  isProcessing 
}: { 
  title: string; 
  onClose: () => void;
  isProcessing: boolean;
}) {
  return (
    <div className="flex items-center justify-between px-6 py-4 border-b border-border-light bg-bg-surface">
      <h2 className="text-lg font-black text-text-primary uppercase tracking-wider">
        {title}
      </h2>
      <button
        onClick={onClose}
        disabled={isProcessing}
        className="p-2 hover:bg-bg-muted rounded-sm transition-colors disabled:opacity-50"
      >
        <X className="h-5 w-5 text-text-secondary" />
      </button>
    </div>
  );
}

function PaymentModalFooter({
  canComplete,
  isProcessing,
  onComplete,
  error,
}: {
  canComplete: boolean;
  isProcessing: boolean;
  onComplete: () => void;
  error: string | null;
}) {
  return (
    <div className="px-6 py-4 border-t border-border-light bg-bg-muted">
      {error && (
        <p className="text-sm text-danger-main mb-3 text-center">{error}</p>
      )}
      <button
        onClick={onComplete}
        disabled={!canComplete || isProcessing}
        className={`
          w-full py-4 text-base font-bold uppercase tracking-wider rounded-sm
          transition-all flex items-center justify-center gap-2
          ${canComplete && !isProcessing
            ? 'bg-success-main text-white hover:bg-success-hover'
            : 'bg-bg-muted text-text-muted cursor-not-allowed'
          }
        `}
      >
        {isProcessing ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            İşleniyor...
          </>
        ) : (
          <>
            <Check className="h-5 w-5" />
            Ödemeyi Tamamla
          </>
        )}
      </button>
    </div>
  );
}

// ============================================
// PAYMENT LINE ITEM - Tek Ödeme Satırı
// ============================================

interface PaymentLineItemProps {
  payment: PaymentLine;
  isActive: boolean;
  onActivate: () => void;
  onUpdate: (updates: Partial<PaymentLine>) => void;
  onRemove: () => void;
  restaurantId: string;
  disabled: boolean;
}

function PaymentLineItem({
  payment,
  isActive,
  onActivate,
  onUpdate,
  onRemove,
  restaurantId,
  disabled,
}: PaymentLineItemProps) {
  const [localAmount, setLocalAmount] = useState(payment.amount.toString());

  const handleAmountChange = (value: string) => {
    setLocalAmount(value);
    const num = parseFloat(value.replace(',', '.')) || 0;
    onUpdate({ amount: num });
  };

  return (
    <div 
      onClick={onActivate}
      className={`
        p-4 border rounded-sm transition-all cursor-pointer
        ${isActive 
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
              {payment.method === 'cash' ? 'Nakit' : 
               payment.method === 'credit_card' ? 'Kredi Kartı' :
               payment.method === 'open_account' ? 'Açık Hesap' : payment.method}
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
              onChange={(customer) => onUpdate({ customerId: customer?.id })}
              disabled={disabled}
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

// ============================================
// MOBILE BOTTOM SHEET - Mobil Ödeme Ekranı
// ============================================

interface MobilePaymentSheetProps {
  hook: ReturnType<typeof usePayment>;
  orderTotal: number;
  restaurantId: string;
  onClose: () => void;
  getMethodIcon: (method: PaymentMethod) => any;
  handleComplete: () => void;
}

function MobilePaymentSheet({
  hook,
  orderTotal,
  restaurantId,
  onClose,
  getMethodIcon,
  handleComplete,
}: MobilePaymentSheetProps) {
  const [showNumpad, setShowNumpad] = useState(false);

  return (
    <div className="fixed inset-0 z-50 bg-bg-app flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-bg-surface border-b border-border-light">
        <button onClick={onClose} className="p-2 -ml-2">
          <X className="h-6 w-6 text-text-secondary" />
        </button>
        <h2 className="text-base font-bold text-text-primary">Ödeme Al</h2>
        <div className="w-10" /> {/* Spacer */}
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
                <span className="text-xs">
                  {method === 'cash' ? 'Nakit' : 
                   method === 'credit_card' ? 'Kart' :
                   method === 'open_account' ? 'Cari' : method}
                </span>
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
              <span className="text-sm font-medium">{payment.method}</span>
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
        {hook.activePaymentIndex !== null && hook.payments[hook.activePaymentIndex]?.method === PaymentMethod.OPEN_ACCOUNT && (
          <div className="mt-3">
            <CustomerSelector
              restaurantId={restaurantId}
              value={hook.payments[hook.activePaymentIndex]?.customerId}
              onChange={(customer) => {
                const idx = hook.activePaymentIndex;
                const payment = idx !== null ? hook.payments[idx] : null;
                if (payment) {
                  hook.updatePaymentLine(payment.id, { 
                    customerId: customer?.id 
                  });
                }
              }}
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
            ${hook.canCompletePayment && !hook.isProcessing
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

// ============================================
// QUICK NUM PAD - Mobil Nümerik Pad
// ============================================

interface QuickNumPadProps {
  value: string;
  onDigit: (digit: string) => void;
  onDelete: () => void;
  onClear: () => void;
  onConfirm: () => void;
}

function QuickNumPad({
  value,
  onDigit,
  onDelete,
  onClear,
  onConfirm,
}: QuickNumPadProps) {
  const digits = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', ','];

  return (
    <div className="space-y-2">
      {/* Display */}
      <div className="text-center p-3 bg-bg-surface border border-border-light rounded-sm">
        <span className="text-2xl font-black text-text-primary">{value}</span>
        <span className="text-lg font-bold text-text-muted ml-1">TL</span>
      </div>

      {/* Buttons Grid */}
      <div className="grid grid-cols-3 gap-2">
        {digits.map((digit) => (
          <button
            key={digit}
            onClick={() => onDigit(digit)}
            className="h-14 text-xl font-bold bg-bg-surface border border-border-light 
              hover:bg-primary-main/10 hover:border-primary-main rounded-sm transition-colors"
          >
            {digit}
          </button>
        ))}

        {/* Delete */}
        <button
          onClick={onDelete}
          className="h-14 flex items-center justify-center bg-bg-muted border border-border-light 
            hover:bg-danger-main/10 hover:border-danger-main rounded-sm transition-colors"
        >
          <span className="text-lg font-bold text-text-secondary">⌫</span>
        </button>

        {/* Clear */}
        <button
          onClick={onClear}
          className="h-14 flex items-center justify-center bg-bg-muted border border-border-light 
            hover:bg-warning-main/10 rounded-sm transition-colors"
        >
          <span className="text-xs font-bold text-text-secondary">TEMİZLE</span>
        </button>

        {/* Confirm */}
        <button
          onClick={onConfirm}
          className="h-14 flex items-center justify-center bg-success-main text-white 
            hover:bg-success-hover rounded-sm transition-colors"
        >
          <Check className="h-6 w-6" />
        </button>
      </div>
    </div>
  );
}

// ============================================
// CHANGE CONFIRMATION DIALOG - Nakit Üstü Onay
// ============================================

interface ChangeConfirmationDialogProps {
  changeAmount: number;
  onConfirm: () => void;
  onCancel: () => void;
}

function ChangeConfirmationDialog({
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
        <h3 className="text-xl font-black text-text-primary mb-2">
          NAKİT ÜSTÜ
        </h3>
        
        {/* Amount */}
        <p className="text-4xl font-black text-success-main mb-6">
          {formatPaymentAmount(changeAmount)}
        </p>
        
        {/* Message */}
        <p className="text-sm text-text-secondary mb-6">
          Müşteriye {formatPaymentAmount(changeAmount)} TL para üstü verilecek.
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
