// ============================================
// USEPAYMENT HOOK - Ödeme Mantığı (Beyin Layer)
// UI'dan bağımsız tüm hesaplamalar ve socket yönetimi
// ============================================

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { paymentsApi, SplitPaymentResponse } from '../services/payments.service';
import { ordersApi } from '../services';
import { useSocketStore } from '@/modules/shared/api/socket';
import { 
  PaymentMethod, 
  PaymentLine, 
  Discount, 
  DiscountType,
  calculateTotalPaid, 
  calculateRemaining, 
  calculateChange,
  isPaymentComplete,
  formatPaymentAmount
} from '../types';

interface UsePaymentProps {
  orderId: string;
  orderTotal: number;
  restaurantId: string;
  onSuccess?: (response: SplitPaymentResponse) => void;
  onError?: (error: Error) => void;
}

export interface NumericPadValue {
  value: string;      // Raw input value
  display: string;     // Formatted for display (e.g., "1.234,56")
  cents: number;       // Value in cents for precision
}

export function usePayment({ 
  orderId, 
  orderTotal, 
  restaurantId,
  onSuccess,
  onError 
}: UsePaymentProps) {
  const router = useRouter();
  const { emit, on, off, isConnected } = useSocketStore();

  // ============ STATE ============

  // Ödeme satırları (parçalı ödeme)
  const [payments, setPayments] = useState<PaymentLine[]>([]);
  
  // İndirim bilgisi
  const [discount, setDiscount] = useState<Discount | null>(null);
  
  // Aktif ödeme satırı (düzenlenmekte olan)
  const [activePaymentIndex, setActivePaymentIndex] = useState<number | null>(null);
  
  // API loading state
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Error state
  const [error, setError] = useState<string | null>(null);

  // Sunucudan çekilen güncel sipariş tutarı (socket ile anlık güncellenir)
  const [serverOrderTotal, setServerOrderTotal] = useState<number>(orderTotal);
  const [isLoadingOrder, setIsLoadingOrder] = useState(false);
  const [orderStatus, setOrderStatus] = useState<string>('');

  // ============ NUMERIC PAD STATE (Mobil Uyumluluk) ============
  
  const [numericPadValue, setNumericPadValue] = useState<NumericPadValue>({
    value: '',
    display: '0',
    cents: 0,
  });

  // Mobile kontrolü (dokunmatik pad için)
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Client-side only check
    const checkMobile = () => {
      setIsMobile(typeof window !== 'undefined' && 
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
      );
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // ============ SİPARİŞ VERİLERİNİ SOCKET ÜZERİNDEN GÜNCELLE ============
  
  // orderId değiştiğinde en güncel sipariş verilerini sunucudan çek
  useEffect(() => {
    if (!orderId) return;
    
    // Önce mevcut değeri resetle (orderId değiştiğinde)
    setServerOrderTotal(orderTotal);
    setOrderStatus('');
    
    const fetchLatestOrder = async () => {
      setIsLoadingOrder(true);
      try {
        const order = await ordersApi.getOrderById(orderId);
        setServerOrderTotal(order.totalAmount || 0);
        setOrderStatus(order.status || '');
        console.log('[usePayment] Fetched latest order:', order.totalAmount);
      } catch (err) {
        console.error('[usePayment] Failed to fetch order:', err);
        // Hata olursa prop'tan gelen değeri kullan
        setServerOrderTotal(orderTotal);
      } finally {
        setIsLoadingOrder(false);
      }
    };
    
    fetchLatestOrder();
  }, [orderId]);

  // ============ COMPUTED VALUES (useMemo) ============

  /**
   * İndirimli toplam tutar (sunucudan gelen güncel tutarı kullan)
   */
  const finalTotal = useMemo(() => {
    if (!discount) return serverOrderTotal || orderTotal;
    
    let total = serverOrderTotal || orderTotal;
    if (discount.type === DiscountType.DISCOUNT) {
      // İskonto: doğrudan tutardan düş
      total = total - discount.amount;
    }
    // İkram (complimentary) de aynı şekilde hesaplanır, 
    // ama raporlamada ayrı gösterilir
    
    return Math.max(0, total);
  }, [orderTotal, discount, serverOrderTotal]);

  /**
   * Ödenen toplam miktar
   */
  const totalPaid = useMemo(() => {
    return calculateTotalPaid(payments);
  }, [payments]);

  /**
   * Kalan tutar
   */
  const remainingBalance = useMemo(() => {
    return calculateRemaining(finalTotal, payments);
  }, [finalTotal, payments]);

  /**
   * Ödeme tamamlandı mı?
   */
  const canCompletePayment = useMemo(() => {
    return isPaymentComplete(finalTotal, payments);
  }, [finalTotal, payments]);

  /**
   * Nakit ödemeleri için toplam para üstü
   */
  const totalChange = useMemo(() => {
    return payments
      .filter(p => p.method === PaymentMethod.CASH)
      .reduce((sum, p) => sum + calculateChange(p.cashReceived || 0, p.amount), 0);
  }, [payments]);

  // ============ PAYMENT ACTIONS ============

  /**
   * Yeni ödeme satırı ekle
   */
  const addPaymentLine = useCallback((method: PaymentMethod) => {
    const newLine: PaymentLine = {
      id: crypto.randomUUID(),
      method,
      amount: 0,
      ...(method === PaymentMethod.CASH ? { cashReceived: 0 } : {}),
      ...(method === PaymentMethod.OPEN_ACCOUNT ? { customerId: undefined } : {}),
    };
    
    setPayments(prev => [...prev, newLine]);
    setActivePaymentIndex(payments.length);
  }, [payments.length]);

  /**
   * Ödeme satırını güncelle
   */
  const updatePaymentLine = useCallback((id: string, updates: Partial<PaymentLine>) => {
    setPayments(prev => 
      prev.map(p => p.id === id ? { ...p, ...updates } : p)
    );
  }, []);

  /**
   * Ödeme satırını sil
   */
  const removePaymentLine = useCallback((id: string) => {
    setPayments(prev => prev.filter(p => p.id !== id));
    if (activePaymentIndex !== null && activePaymentIndex >= payments.length - 1) {
      setActivePaymentIndex(null);
    }
  }, [activePaymentIndex, payments.length]);

  /**
   * Tüm ödemeleri temizle
   */
  const clearPayments = useCallback(() => {
    setPayments([]);
    setActivePaymentIndex(null);
    setError(null);
  }, []);

  // ============ DISCOUNT ACTIONS ============

  /**
   * İndirim uygula
   */
  const applyDiscount = useCallback((type: DiscountType, amount: number, reason?: string) => {
    setDiscount({ type, amount, reason });
  }, []);

  /**
   * İndirimi kaldır
   */
  const removeDiscount = useCallback(() => {
    setDiscount(null);
  }, []);

  // ============ NUMERIC PAD ACTIONS ============

  /**
   * Numeric pad'e rakam ekle
   */
  const appendDigit = useCallback((digit: string) => {
    setNumericPadValue(prev => {
      // Sadece rakam ve virgül/nokta kabul et
      if (!/[\d,]/.test(digit)) return prev;
      
      let newValue = prev.value;
      
      // Virgül geldiyse ondalık separator olarak işle
      if (digit === ',' || digit === '.') {
        if (prev.value.includes(',') || prev.value.includes('.')) {
          return prev; // Zaten ondalık var
        }
        newValue = prev.value + ',';
      } else {
        // Sıfırları önle
        if (prev.value === '0' && digit !== ',') {
          newValue = digit;
        } else {
          newValue = prev.value + digit;
        }
      }
      
      // Türk formatı: 1.234,56
      const numericPart = newValue.replace(',', '.');
      const cents = Math.round(parseFloat(numericPart || '0') * 100);
      
      return {
        value: newValue,
        display: formatNumericDisplay(newValue),
        cents,
      };
    });
  }, []);

  /**
   * Numeric pad'den son karakteri sil
   */
  const deleteLastDigit = useCallback(() => {
    setNumericPadValue(prev => {
      if (prev.value.length <= 1) {
        return { value: '', display: '0', cents: 0 };
      }
      const newValue = prev.value.slice(0, -1);
      return {
        value: newValue,
        display: formatNumericDisplay(newValue),
        cents: Math.round(parseFloat(newValue.replace(',', '.')) * 100) || 0,
      };
    });
  }, []);

  /**
   * Numeric pad'i temizle
   */
  const clearNumericPad = useCallback(() => {
    setNumericPadValue({ value: '', display: '0', cents: 0 });
  }, []);

  /**
   * Numeric pad değerini aktif ödemeye uygula
   */
  const applyNumericPadToActivePayment = useCallback(() => {
    if (activePaymentIndex === null || activePaymentIndex >= payments.length) return;
    
    const activePayment = payments[activePaymentIndex];
    if (!activePayment) return;
    
    const amount = numericPadValue.cents / 100;
    
    if (activePayment.method === PaymentMethod.CASH) {
      // Nakit için: hem amount hem cashReceived aynı (veya fazla olabilir)
      updatePaymentLine(activePayment.id, {
        amount,
        cashReceived: amount, // Şimdilik eşit, UI'da ayarlanabilir
      });
    } else {
      updatePaymentLine(activePayment.id, { amount });
    }
    
    clearNumericPad();
  }, [activePaymentIndex, payments, numericPadValue, updatePaymentLine, clearNumericPad]);

  // ============ API ACTIONS ============

  /**
   * Parçalı ödemeyi tamamla
   */
  const completePayment = useCallback(async () => {
    if (!canCompletePayment) {
      setError(`Ödenmemiş tutar: ${formatPaymentAmount(remainingBalance)}`);
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // API isteği için formatla
      const requestData = {
        order_id: orderId,
        payments: payments.map(p => ({
          amount: p.amount,
          payment_method: p.method,
          customer_id: p.customerId,
          cash_received: p.cashReceived,
        })),
        discount_type: discount?.type,
        discount_amount: discount?.amount,
        discount_reason: discount?.reason,
      };

      const response = await paymentsApi.createSplitPayment(requestData);

      // Başarılı - Socket broadcast
      if (isConnected) {
        // Masa durumu güncelleme event'i
        emit('table:available', { 
          restaurantId,
          orderId,
        });
        
        // Sipariş ödendi event'i
        emit('order:paid', {
          orderId,
          restaurantId,
          totalAmount: finalTotal,
          payments: payments.map(p => ({
            method: p.method,
            amount: p.amount,
          })),
        });
      }

      // Callback'leri çağır
      onSuccess?.(response);
      
      // Başarılı mesaj
      toast.success('Ödeme başarıyla tamamlandı!');
      
      // Temizle
      clearPayments();
      removeDiscount();
      
    } catch (err: any) {
      const errorMessage = err?.message || 'Ödeme işlemi başarısız';
      setError(errorMessage);
      onError?.(err);
      toast.error(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  }, [
    canCompletePayment,
    remainingBalance,
    orderId,
    payments,
    discount,
    finalTotal,
    restaurantId,
    isConnected,
    emit,
    onSuccess,
    onError,
    clearPayments,
    removeDiscount,
  ]);

  /**
   * Ödemeyi iptal et / geri al
   */
  const revertPayment = useCallback(async (paymentId: string, reason: string) => {
    setIsProcessing(true);
    setError(null);

    try {
      await paymentsApi.revertPayment({
        payment_id: paymentId,
        reason,
      });

      // Socket broadcast
      if (isConnected) {
        emit('payment:reverted', {
          paymentId,
          orderId,
          restaurantId,
        });
      }

      toast.success('Ödeme iptal edildi');
    } catch (err: any) {
      const errorMessage = err?.message || 'İptal işlemi başarısız';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  }, [orderId, restaurantId, isConnected, emit]);

  // ============ SOCKET EVENT LISTENERS ============

  useEffect(() => {
    if (!restaurantId) return;

    // Sipariş güncellendiğinde (başka terminalden ürün eklendi vs)
    const handleOrderUpdated = (data: any) => {
      if (data.orderId === orderId) {
        console.log('[usePayment] Order updated from socket:', data);
        // Sipariş tutarı güncellendi
        if (data.totalAmount !== undefined) {
          setServerOrderTotal(data.totalAmount);
          console.log('[usePayment] Order total updated to:', data.totalAmount);
        }
        // Sipariş iptal edildi veya ödendi
        if (data.status === 'cancelled' || data.status === 'paid') {
          setOrderStatus(data.status);
        }
      }
    };

    // Ödeme durumu değişikliği dinleyicisi
    const handlePaymentUpdated = (data: any) => {
      if (data.orderId === orderId) {
        // Uzaktan ödeme güncellendi, UI'ı yenile
        console.log('[usePayment] Payment updated from socket:', data);
      }
    };

    // Müşteri borç güncelleme
    const handleCustomerDebtUpdated = (data: any) => {
      console.log('[usePayment] Customer debt updated:', data);
    };

    // Socket event'lerini dinle
    on('order:updated', handleOrderUpdated);
    on('payment:updated', handlePaymentUpdated);
    on('customer:debt-updated', handleCustomerDebtUpdated);

    // Cleanup - sadece event name kullan
    return () => {
      off('order:updated');
      off('payment:updated');
      off('customer:debt-updated');
    };
  }, [restaurantId, orderId, on, off]);

  // ============ RETURN ============

  return {
    // State
    payments,
    discount,
    activePaymentIndex,
    isProcessing,
    error,
    numericPadValue,
    isMobile,
    
    // Server order data (real-time)
    serverOrderTotal,
    isLoadingOrder,
    orderStatus,
    
    // Computed
    finalTotal,
    totalPaid,
    remainingBalance,
    canCompletePayment,
    totalChange,
    orderTotal,
    
    // Actions
    addPaymentLine,
    updatePaymentLine,
    removePaymentLine,
    clearPayments,
    applyDiscount,
    removeDiscount,
    setActivePaymentIndex,
    completePayment,
    revertPayment,
    
    // Numeric Pad
    appendDigit,
    deleteLastDigit,
    clearNumericPad,
    applyNumericPadToActivePayment,
  };
}

// ============================================
// HELPER: Numeric Display Formatter
// ============================================

function formatNumericDisplay(value: string): string {
  if (!value) return '0';
  
  // Türk formatı: 1.234,56
  const parts = value.split(',');
  let integerPart = parts[0];
  const decimalPart = parts[1];
  
  // Binlik ayracı ekle
  integerPart = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  
  return decimalPart !== undefined 
    ? `${integerPart},${decimalPart}`
    : integerPart;
}

// ============================================
// USEMEMO SELECTORS (Performance)
// ============================================

/**
 * Belirli bir ödeme yönteminin toplamını getir
 */
export function usePaymentMethodTotal(payments: PaymentLine[], method: PaymentMethod): number {
  return useMemo(() => {
    return payments
      .filter(p => p.method === method)
      .reduce((sum, p) => sum + p.amount, 0);
  }, [payments, method]);
}

/**
 * Kalan tutarın yüzdesini hesapla
 */
export function useRemainingPercentage(remaining: number, total: number): number {
  return useMemo(() => {
    if (total === 0) return 0;
    return Math.round((remaining / total) * 100);
  }, [remaining, total]);
}
