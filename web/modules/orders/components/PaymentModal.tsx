'use client';

import { http } from '@/modules/shared/api/http';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  X,
  CreditCard,
  Banknote,
  Smartphone,
  Building,
  User,
  Calculator,
} from 'lucide-react';
import { usePayment } from '../hooks/usePayment';
import { usePaymentModal } from '../hooks/usePaymentModal';
import { PaymentMethod, DiscountType } from '../types';
import { PaymentSummaryCard } from './PaymentSummaryCard';
import { PaymentStatusBar } from './PaymentStatusBar';
import { PaymentMethodsGrid } from './PaymentMethodsGrid';
import { PaymentMethodDetails } from './PaymentMethodDetails';
import { NewCustomerModal } from './NewCustomerModal';
import { PaymentLineItem } from './PaymentLineItem';
import { MobilePaymentSheet } from './MobilePaymentSheet';
import { DiscountDialog } from './DiscountDialog';
import { Customer } from '@/modules/customers/services/customers.service';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  orderTotal: number;
  restaurantId: string;
  onSuccess?: () => void;
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
            <span className="animate-spin">⟳</span>
            İşleniyor...
          </>
        ) : (
          <>
            ✓
            Ödemeyi Tamamla
          </>
        )}
      </button>
    </div>
  );
}

export function PaymentModal({
  isOpen,
  onClose,
  orderId,
  orderTotal,
  restaurantId,
  onSuccess,
}: PaymentModalProps) {
  const router = useRouter();

  const handlePaymentSuccess = () => {
    onSuccess?.();
    onClose();
    router.push('/tables');
  };

  const hook = usePayment({
    orderId,
    orderTotal,
    restaurantId,
    onSuccess: handlePaymentSuccess,
  });

  const customerHook = usePaymentModal({
    restaurantId,
    onSuccess: () => { },
  });

  const { handleAddNewCustomer, isCreatingCustomer } = customerHook;

  const [showChangeConfirm, setShowChangeConfirm] = useState(false);
  const [isNewCustomerModalOpen, setIsNewCustomerModalOpen] = useState(false);
  const [newCustomerInitialName, setNewCustomerInitialName] = useState<string>('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isDiscountDialogOpen, setIsDiscountDialogOpen] = useState(false);

  // Bahşiş Ayarları
  const [tipSettings, setTipSettings] = useState({
    enabled: false,
    editable: true,
    rate: 0.02
  });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const settings: any = await http.get(`/settings/${restaurantId}?group=payment`);
        
        setTipSettings({
          rate: parseFloat(settings.tip_commission_rate) || 0.02,
          enabled: settings.tip_commission_enabled === true || settings.tip_commission_enabled === "true",
          editable: settings.tip_commission_editable === true || settings.tip_commission_editable === "true"
        });
      } catch (error) {
        console.error("Error fetching tip settings:", error);
      }
    };

    if (isOpen && restaurantId) {
      fetchSettings();
    }
  }, [isOpen, restaurantId]);

  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => {
      setIsMobile(typeof window !== 'undefined' && window.innerWidth < 768);
    };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

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

  const handleComplete = async () => {
    if (hook.totalChange > 0 && !showChangeConfirm) {
      setShowChangeConfirm(true);
      return;
    }
    setShowChangeConfirm(false);
    await hook.completePayment();
  };

  const handleOpenNewCustomerModal = (initialName?: string) => {
    setNewCustomerInitialName(initialName || '');
    setIsNewCustomerModalOpen(true);
  };

  const handleApplyDiscount = () => {
    setIsDiscountDialogOpen(true);
  };

  const handleDiscountConfirm = (type: 'discount' | 'complimentary', amount: number, reason: string) => {
    hook.applyDiscount(
      type === 'discount' ? DiscountType.DISCOUNT : DiscountType.COMPLIMENTARY,
      amount,
      reason
    );
    setIsDiscountDialogOpen(false);
  };

  const handleRemoveDiscount = () => {
    hook.removeDiscount();
  };

  const handleNewCustomerCreated = (customer: Customer) => {
    setSelectedCustomer(customer);
    if (hook.activePaymentIndex !== null && hook.payments[hook.activePaymentIndex]) {
      hook.updatePaymentLine(hook.payments[hook.activePaymentIndex].id, { customerId: customer.id });
    }
    setIsNewCustomerModalOpen(false);
  };

  if (!isOpen) return null;

  return (
    <>
      {!isMobile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
          <div className="relative bg-bg-surface w-full max-w-5xl h-[650px] flex flex-col overflow-hidden rounded-sm shadow-xl">
            <div className="flex items-center justify-between px-6 py-3 border-b border-border-light bg-bg-surface flex-shrink-0">
              <h2 className="text-lg font-black text-text-primary uppercase tracking-wider">
                Ödeme Al
              </h2>
              <button
                onClick={onClose}
                disabled={hook.isProcessing}
                className="p-2 hover:bg-bg-muted rounded-sm transition-colors disabled:opacity-50"
              >
                <X className="h-5 w-5 text-text-secondary" />
              </button>
            </div>

            <div className="flex-shrink-0">
              <PaymentStatusBar
                finalTotal={hook.finalTotal}
                remainingBalance={hook.remainingBalance}
                discount={hook.discount?.amount}
                isComplete={hook.canCompletePayment}
              />
            </div>

            <div className="flex flex-1 min-h-0 overflow-hidden relative">
              {/* Syncing Overlay */}
              {hook.isSyncing && (
                <div className="absolute inset-0 z-50 bg-white/20 backdrop-blur-[1px] flex items-center justify-center cursor-wait">
                  <div className="bg-bg-surface px-6 py-3 rounded-sm shadow-xl border border-border-light flex items-center gap-3 animate-pulse">
                    <div className="w-2 h-2 rounded-full bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.8)]" />
                    <span className="text-sm font-bold text-text-primary uppercase tracking-wider">İşlem Senkronize Ediliyor...</span>
                  </div>
                </div>
              )}

              <div className="w-[40%] bg-slate-50 border-r border-border-light overflow-hidden flex flex-col">
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
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
                    isProcessing={hook.isSyncing}
                    onApplyDiscount={hook.discount?.amount ? handleRemoveDiscount : handleApplyDiscount}
                  />

                  <div className="space-y-3">
                    <h4 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                      Ödeme Satırları
                    </h4>
                    {hook.payments.length === 0 ? (
                      <div className="text-center py-6 text-text-muted">
                        <Calculator className="h-10 w-10 mx-auto mb-2 opacity-30" />
                        <p className="text-xs">Henüz ödeme eklenmedi</p>
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
                          disabled={hook.isSyncing}
                          onAddNewCustomer={handleAddNewCustomer}
                          isCreatingCustomer={isCreatingCustomer}
                        />
                      ))
                    )}
                  </div>
                </div>
              </div>

              <div className="w-[60%] flex flex-col overflow-hidden bg-white">
                <div className="flex-shrink-0">
                  <PaymentMethodsGrid
                    selectedMethod={hook.activePaymentIndex !== null ? hook.payments[hook.activePaymentIndex]?.method : undefined}
                    onSelectMethod={(method) => hook.addPaymentLine(method)}
                    disabled={hook.isSyncing}
                  />
                </div>

                <div className="flex-1 overflow-y-auto p-4">
                  <PaymentMethodDetails
                    activePayment={hook.activePaymentIndex !== null ? hook.payments[hook.activePaymentIndex] || null : null}
                    method={hook.activePaymentIndex !== null ? hook.payments[hook.activePaymentIndex]?.method : undefined}
                    onUpdate={(updates) => {
                      if (hook.activePaymentIndex !== null && hook.payments[hook.activePaymentIndex]) {
                        hook.updatePaymentLine(hook.payments[hook.activePaymentIndex].id, updates);
                      }
                    }}
                    disabled={hook.isSyncing}
                    onAddNewCustomer={handleAddNewCustomer}
                    onOpenNewCustomerModal={handleOpenNewCustomerModal}
                    restaurantId={restaurantId}
                    commissionRate={tipSettings.rate}
                    isEditable={tipSettings.editable}
                    tipEnabled={tipSettings.enabled}
                  />
                </div>

                <div className="flex-shrink-0 p-4 border-t border-border-light bg-bg-surface">
                  <PaymentModalFooter
                    canComplete={hook.canCompletePayment}
                    isProcessing={hook.isSyncing}
                    onComplete={handleComplete}
                    error={hook.error}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {isMobile && (
        <MobilePaymentSheet
          hook={hook}
          orderTotal={hook.serverOrderTotal || orderTotal}
          restaurantId={restaurantId}
          onClose={onClose}
          getMethodIcon={getMethodIcon}
          handleComplete={handleComplete}
          onAddNewCustomer={handleAddNewCustomer}
          isCreatingCustomer={isCreatingCustomer}
        />
      )}

      <NewCustomerModal
        isOpen={isNewCustomerModalOpen}
        onClose={() => setIsNewCustomerModalOpen(false)}
        onSuccess={handleNewCustomerCreated}
        restaurantId={restaurantId}
        initialName={newCustomerInitialName}
      />

      <DiscountDialog
        isOpen={isDiscountDialogOpen}
        onClose={() => setIsDiscountDialogOpen(false)}
        onConfirm={handleDiscountConfirm}
        orderTotal={hook.serverOrderTotal || orderTotal}
      />
    </>
  );
}
