'use client';

import { http } from '@/modules/shared/api/http';
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  X,
  CreditCard,
  Banknote,
  Smartphone,
  Building,
  User,
  Ticket,
  Calculator,
} from 'lucide-react';
import { usePayment } from '../hooks/usePayment';
import { usePaymentModal } from '../hooks/usePaymentModal';
import { PaymentMethod, DiscountType } from '../types';
import { PaymentSummaryCard, PaymentSummaryCompact } from './PaymentSummaryCard';
import { PaymentStatusBar } from './PaymentStatusBar';
import { PaymentMethodsGrid } from './PaymentMethodsGrid';
import { PaymentMethodDetails } from './PaymentMethodDetails';
import { NewCustomerModal } from './NewCustomerModal';
import { PaymentLineItem } from './PaymentLineItem';
import { MobilePaymentSheet } from './MobilePaymentSheet';
import { DiscountDialog } from './DiscountDialog';
import { ChangeConfirmationDialog } from './ChangeConfirmationDialog';
import { QuickNumPad } from './QuickNumPad';
import { Customer } from '@/modules/customers/services/customers.service';
import { Button } from '@/modules/shared/components/Button';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  orderTotal: number;
  restaurantId: string;
  onSuccess?: () => void;
  successRedirectPath?: string;
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
  successRedirectPath = '/tables',
}: PaymentModalProps) {
  const router = useRouter();

  const handlePaymentSuccess = () => {
    onSuccess?.();
    onClose();
    router.push(successRedirectPath);
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

  const [isPaymentConfirmOpen, setIsPaymentConfirmOpen] = useState(false);
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
  const [enabledPaymentMethods, setEnabledPaymentMethods] = useState<PaymentMethod[]>(
    Object.values(PaymentMethod),
  );

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const settings: any = await http.get(`/settings/${restaurantId}?group=payment`);

        const rawEnabledMethods = settings.enabled_payment_methods;
        const parsedEnabledMethods = (() => {
          if (Array.isArray(rawEnabledMethods)) {
            return rawEnabledMethods.filter((method): method is PaymentMethod =>
              Object.values(PaymentMethod).includes(method as PaymentMethod),
            );
          }
          if (typeof rawEnabledMethods === 'string') {
            try {
              const parsed = JSON.parse(rawEnabledMethods);
              if (!Array.isArray(parsed)) {
                return [];
              }
              return parsed.filter((method): method is PaymentMethod =>
                Object.values(PaymentMethod).includes(method as PaymentMethod),
              );
            } catch {
              return [];
            }
          }
          return [];
        })();

        setEnabledPaymentMethods(
          parsedEnabledMethods.length > 0
            ? parsedEnabledMethods
            : Object.values(PaymentMethod),
        );

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
  const [isTablet, setIsTablet] = useState(false);
  const [tabletSummaryExpanded, setTabletSummaryExpanded] = useState(false);
  useEffect(() => {
    const check = () => {
      if (typeof window === 'undefined') return;
      setIsMobile(window.innerWidth < 768);
      setIsTablet(window.innerWidth >= 768 && window.innerWidth < 1280);
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
      case PaymentMethod.MEAL_VOUCHER: return Ticket;
      default: return CreditCard;
    }
  };

  const totalTipAmount = useMemo(
    () =>
      hook.payments.reduce(
        (sum, payment) => sum + Number(payment.tipAmount || 0),
        0,
      ),
    [hook.payments],
  );
  const netCollectedAmount = Number(hook.totalPaid) - Number(totalTipAmount);

  const handleComplete = () => {
    setIsPaymentConfirmOpen(true);
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
        <div
          className={`fixed inset-0 z-50 flex ${
            isTablet ? 'items-stretch justify-stretch p-0' : 'items-center justify-center p-4'
          }`}
        >
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
          <div
            className={`relative bg-bg-surface flex flex-col overflow-hidden shadow-xl ${
              isTablet ? 'h-full w-full rounded-none' : 'h-[86vh] w-full max-w-[1400px] rounded-sm'
            }`}
          >
            <div className="flex items-center justify-between gap-2 border-b border-border-light bg-bg-surface px-6 py-3 flex-shrink-0">
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

            {!isTablet ? (
              <div className="flex-shrink-0">
                <PaymentStatusBar
                  finalTotal={hook.finalTotal}
                  remainingBalance={hook.remainingBalance}
                  discount={hook.discount?.amount}
                  isComplete={hook.canCompletePayment}
                  collectedWithTips={netCollectedAmount}
                />
              </div>
            ) : (
              <div className="flex-shrink-0 border-b border-border-light bg-bg-muted/40 px-4 py-2">
                <button
                  type="button"
                  onClick={() => setTabletSummaryExpanded((prev) => !prev)}
                  className="w-full rounded-sm border border-border-light bg-bg-surface p-2 text-left"
                >
                  <PaymentSummaryCompact
                    finalTotal={hook.finalTotal}
                    totalPaid={hook.totalPaid}
                    remainingBalance={hook.remainingBalance}
                    isComplete={hook.canCompletePayment}
                  />
                </button>
              </div>
            )}

            <div className="relative flex flex-1 min-h-0 overflow-hidden">
              {/* Syncing Overlay */}
              {hook.isSyncing && (
                <div className="absolute inset-0 z-50 bg-white/20 backdrop-blur-[1px] flex items-center justify-center cursor-wait">
                  <div className="bg-bg-surface px-6 py-3 rounded-sm shadow-xl border border-border-light flex items-center gap-3 animate-pulse">
                    <div className="w-2 h-2 rounded-full bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.8)]" />
                    <span className="text-sm font-bold text-text-primary uppercase tracking-wider">İşlem Senkronize Ediliyor...</span>
                  </div>
                </div>
              )}

              {!isTablet ? (
                <section className="w-[25%] border-r border-border-light bg-slate-50 p-4">
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
                  />
                  <div className="mt-3">
                    {hook.discount?.amount ? (
                      <Button
                        variant="ghost"
                        className="min-h-11 w-full text-danger-main"
                        onClick={handleRemoveDiscount}
                      >
                        İndirimi Kaldır
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        className="min-h-11 w-full"
                        onClick={handleApplyDiscount}
                      >
                        İndirim Uygula
                      </Button>
                    )}
                  </div>
                </section>
              ) : null}

              <section className={`${isTablet ? 'w-[55%]' : 'w-[40%]'} flex min-h-0 flex-col border-r border-border-light bg-white`}>
                <div className="flex-shrink-0">
                  <PaymentMethodsGrid
                    selectedMethod={hook.activePaymentIndex !== null ? hook.payments[hook.activePaymentIndex]?.method : undefined}
                    onSelectMethod={(method) => hook.addPaymentLine(method)}
                    methods={enabledPaymentMethods}
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
                    tipEnabled={tipSettings.enabled}
                  />
                </div>
                <div className="flex-shrink-0 border-t border-border-light bg-bg-surface p-4">
                  <QuickNumPad
                    value={hook.numericPadValue.display}
                    onDigit={hook.appendDigit}
                    onDelete={hook.deleteLastDigit}
                    onFillFullAmount={hook.fillActivePaymentWithRemaining}
                    canFillFullAmount={
                      hook.remainingBalance > 0 &&
                      hook.activePaymentIndex !== null &&
                      hook.activePaymentIndex < hook.payments.length
                    }
                    fillButtonTitle={
                      hook.remainingBalance > 0 ? 'Kalan tutarı doldur' : 'Kalan tutar yok'
                    }
                  />
                </div>
              </section>

              <section className={`${isTablet ? 'w-[45%]' : 'w-[35%]'} flex min-h-0 flex-col bg-slate-50`}>
                <div className="flex-shrink-0 border-b border-border-light px-4 py-3">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                    Ödeme Satırları
                  </h4>
                </div>
                <div className="flex-1 overflow-y-auto p-4">
                  {hook.payments.length === 0 ? (
                    <div className="text-center py-6 text-text-muted">
                      <Calculator className="h-10 w-10 mx-auto mb-2 opacity-30" />
                      <p className="text-xs">Henüz ödeme eklenmedi</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {hook.payments.map((payment, index) => (
                        <PaymentLineItem
                          key={payment.id}
                          payment={payment}
                          methodSequence={
                            hook.payments
                              .slice(0, index + 1)
                              .filter((line) => line.method === payment.method).length
                          }
                          isActive={hook.activePaymentIndex === index}
                          onActivate={() => hook.setActivePaymentIndex(index)}
                          onRemove={() => hook.removePaymentLine(payment.id)}
                          disabled={hook.isSyncing}
                        />
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex-shrink-0">
                  <PaymentModalFooter
                    canComplete={hook.canCompletePayment}
                    isProcessing={hook.isSyncing}
                    onComplete={handleComplete}
                    error={hook.error}
                  />
                </div>
              </section>

              {isTablet && tabletSummaryExpanded ? (
                <div className="absolute inset-0 z-40 bg-black/30 p-4">
                  <button
                    type="button"
                    className="absolute inset-0"
                    aria-label="Özet panelini kapat"
                    onClick={() => setTabletSummaryExpanded(false)}
                  />
                  <div className="relative ml-auto mr-auto mt-2 max-w-xl rounded-sm border border-border-light bg-bg-surface p-4 shadow-xl">
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
                    />
                    <div className="mt-3">
                      {hook.discount?.amount ? (
                        <Button
                          variant="ghost"
                          className="min-h-11 w-full text-danger-main"
                          onClick={handleRemoveDiscount}
                        >
                          İndirimi Kaldır
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          className="min-h-11 w-full"
                          onClick={handleApplyDiscount}
                        >
                          İndirim Uygula
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ) : null}
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
          enabledMethods={enabledPaymentMethods}
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

      {isPaymentConfirmOpen && (
        <ChangeConfirmationDialog
          netAmount={hook.finalTotal}
          payments={hook.payments.filter((payment) => payment.amount > 0)}
          discount={hook.discount}
          totalPaidAmount={hook.totalPaid}
          totalTipAmount={totalTipAmount}
          onCancel={() => setIsPaymentConfirmOpen(false)}
          onConfirm={async () => {
            setIsPaymentConfirmOpen(false);
            await hook.completePayment();
          }}
        />
      )}
    </>
  );
}
