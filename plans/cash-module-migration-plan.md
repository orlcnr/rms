# Cash Module Migration Plan

## Özet

Bu plan, `frontend/modules/cash` modülünün `web/modules/cash` altına taşınmasını kapsamaktadır. Mevcut basit service.ts dosyası, web modülü standartlarına uygun hale getirilecek ve yapısal olarak zenginleştirilecektir.

Kasa modülü (Cash Management), bir RMS sisteminin "gerçek dünya" ile "dijital verinin" birleştiği en kriti̇k noktadır. Bu planda Socket entegrasyonu, Kör Sayım mantığı, Ödeme modülü entegrasyonu, Bahşiş takibi ve detaylı UI bileşenleri yer almaktadır.

**Önemli Kurallar:**
1. **Ciro vs Bahşiş Ayrımı**: Ciro (Revenue) ve Bahşiş (Liability) ayrı hareketler olarak kaydedilir.
2. **Likidite Kontrolü**: Kartla alınan bahşiş kasadaki fiziksel parayı etkilemez.
3. **Personel Hak Ediş**: Kasa kapanışında kartla alınan toplam bahşiş raporlanmalı.

---

## Mevcut Durum

### Backend (Tamamlanmış)
- **Konum**: `backend/src/modules/cash/`
- **İçerik**:
  - `cash.controller.ts` - REST API endpoint'leri
  - `cash.service.ts` - İş mantığı
  - `cash.module.ts` - NestJS modülü
  - `entities/` - CashRegister, CashSession, CashMovement
  - `dto/` - Veri transfer nesneleri
  - `enums/` - CashSessionStatus, CashMovementType

### Frontend (Taşınacak)
- **Konum**: `frontend/modules/cash/`
- **İçerik**:
  - `service.ts` - Sadece API çağrıları (112 satır)

### Web (Hedef)
- **Konum**: `web/modules/`
- **Mevcut Modüller**: orders, dashboard, products, payments, customers, tables, inventory, menus, restaurants, shared
- **Eksik**: cash modülü

---

## Etkilenecek Dosyalar

### Oluşturulacak Dosyalar (Yeni)
```
web/modules/cash/
├── types.ts                 # Tüm tipler ve enum'lar (Güncellendi)
├── services.ts              # API servisleri (dönüştürülmüş)
├── socket.ts                # Socket event yönetimi (YENİ)
├── components/              # UI bileşenleri
│   ├── CashDashboard.tsx    # Kasa ana sayfası
│   ├── CashRegisters.tsx    # Kasa listesi
│   ├── CashOpenModal.tsx    # Kasa açılış modalı (YENİ)
│   ├── CashCloseModal.tsx   # Kasa kapanış modalı (YENİ - Kör Sayım)
│   ├── CashMovementForm.tsx # Hareket ekleme formu
│   ├── CashFlowChart.tsx    # Nakit akışı grafiği (YENİ)
│   ├── DenominationTable.tsx # Banknot sayım tablosu (YENİ)
│   └── CashSummaryCard.tsx  # Kasa özeti kartı (YENİ - 3'lü yapı)
├── hooks/                   # Custom hooks
│   ├── useCash.ts          # Ana cash hook
│   └── useCashSocket.ts    # Socket event hook (YENİ)
└── utils/                   # Yardımcı fonksiyonlar
    ├── cash-calculations.ts
    └── denomination.ts      # Banknot hesaplama (YENİ)
```

### Güncellenecek Dosyalar
- `web/modules/shared/components/Sidebar.tsx` - Kasa menü item'ı eklenecek
- `web/app/(main)/` - Kasa sayfası route'ları eklenecek
- `web/modules/orders/hooks/usePayment.ts` - Ödeme sonrası cash movement tetikleme

### Kaldırılacak Dosyalar
- `frontend/modules/cash/service.ts` - Taşıma sonrası silinecek

---

## Adım Adım Değişiklikler

### Aşama 1: Temel Taşıma

#### 1.1 web/modules/cash/types.ts Oluştur
Backend'deki entity'leri ve enum'ları TypeScript tipi olarak tanımla:

```typescript
// Enum'lar
export enum CashSessionStatus {
  OPEN = 'open',
  CLOSED = 'closed',
}

export enum CashMovementType {
  SALE = 'sale',      // Satış (Ciro)
  IN = 'in',          // Giriş (Nakit girişi, Bahşiş girişi)
  OUT = 'out',        // Çıkış (Nakit çıkışı)
}

// YENİ: Hareket alt türü (bahşiş için)
export enum CashMovementSubtype {
  REGULAR = 'regular',     // Normal satış
  TIP = 'tip',            // Bahşiş
  REFUND = 'refund',       // İade
  EXPENSE = 'expense',    // Gider
}

// Bayraklar
export enum CashMovementFlags {
  IS_LIQUID = 'is_liquid',     // Likid mi? (nakit = true, kart = false)
  IS_REVENUE = 'is_revenue',   // Ciro mu? (true = ciro, false = emanet/borç)
}

// Tipler - Genişletilmiş
export interface CashRegister {
  id: string;
  name: string;
  active: boolean;
  restaurantId: string;
}

export interface CashSession {
  id: string;
  openedAt: Date;
  closedAt?: Date;
  openingBalance: number;       // Başlangıç parası
  expectedBalance: number;      // Sistemdeki hesaplanan (Opening + Sales + In - Out)
  reportedBalance?: number;     // Personelin sayıp girdiği (Kör sayım)
  difference?: number;          // (Reported - Expected) -> Açık veya Fazla
  closingBalance?: number;      // Kapanış bakiyesi
  countedBalance?: number;      // Sayılan bakiye (alias)
  status: CashSessionStatus;
  openedBy?: { id: string; first_name: string; last_name: string };
  closedBy?: { id: string; first_name: string; last_name: string };
  cashRegister?: CashRegister;
  
  // YENİ: Bahşiş özet bilgileri
  totalCashTips?: number;       // Gün içinde nakit bahşiş
  totalCardTips?: number;       // Gün içinde kart bahşiş
}

export interface CashMovement {
  id: string;
  cashSessionId: string;
  type: CashMovementType;
  subtype?: CashMovementSubtype; // YENİ: Alt tür
  paymentMethod: string;        // Ödeme yöntemi
  amount: number;
  isLiquid: boolean;            // Likid mi? (nakit = true, kart = false)
  isRevenue: boolean;           // YENİ: Ciro mu? (tip için false olacak)
  description: string;
  userId: string;
  createdAt: string;
  orderId?: string;
  user?: { first_name: string; last_name: string };
}

// Kör sayım için banknot detayları
export interface DenominationEntry {
  denomination: number;  // 200, 100, 50, 20, 10, 5, 1
  count: number;
}

export interface CashCloseData {
  countedBalance: number;              // Personelin saydığı
  creditCardTotal: number;            // Kredi kartı slip toplamı
  denominations?: DenominationEntry[]; // Banknot detayları (opsiyonel)
  notes?: string;
  
  // YENİ: Bahşiş dağıtımı
  distributeCardTips?: boolean;       // Kart bahşişini kasadan dağıtacak mı?
  cardTipsToDistribute?: number;      // Dağıtılacak kart bahşişi
}

// YENİ: Kasa özet kartı için
export interface CashSummaryData {
  netSales: number;         // Net Satış (Ciro - İndirim)
  totalTips: number;        // Toplam Bahşiş
  totalCash: number;        // Kasa Toplamı (Nakit + Nakit Bahşiş)
  cashTips: number;         // Nakit Bahşiş
  cardTips: number;         // Kart Bahşiş
}
```

#### 1.2 web/modules/cash/services.ts Oluştur
Mevcut `frontend/modules/cash/service.ts` dosyasını web standartlarına uygun şekilde yeniden yaz:

```typescript
// web/modules/cash/services.ts

import { http } from '@/modules/shared/api/http';
import {
  CashRegister,
  CashSession,
  CashMovement,
  CashSessionStatus,
  CashMovementType,
  CashMovementSubtype,
} from './types';

export interface GetSessionsParams {
  registerId?: string;
  startDate?: string;
  endDate?: string;
  status?: CashSessionStatus;
}

export interface CreateMovementDto {
  type: CashMovementType;
  subtype?: CashMovementSubtype;
  paymentMethod: string;
  amount: number;
  isLiquid: boolean;
  isRevenue: boolean;
  description?: string;
  orderId?: string;
}

export const cashApi = {
  // Kasa Kayıtları
  getRegisters: async (): Promise<CashRegister[]> => {
    return await http.get('/cash/registers');
  },

  getRegistersWithStatus: async (): Promise<any[]> => {
    return await http.get('/cash/registers/with-status');
  },

  createRegister: async (name: string): Promise<CashRegister> => {
    return await http.post('/cash/registers', { name });
  },

  // Oturumlar
  getSessions: async (registerId: string): Promise<CashSession[]> => {
    return await http.get(`/cash/registers/${registerId}/sessions`);
  },

  openSession: async (dto: {
    cashRegisterId: string;
    openingBalance: number;
    notes?: string;
  }): Promise<CashSession> => {
    return await http.post('/cash/sessions/open', dto);
  },

  closeSession: async (sessionId: string, dto: {
    countedBalance: number;
    creditCardTotal?: number;
    denominations?: any[];
    notes?: string;
    distributeCardTips?: boolean;
  }): Promise<CashSession> => {
    return await http.post(`/cash/sessions/${sessionId}/close`, dto);
  },

  // Hareketler
  getMovements: async (sessionId: string): Promise<CashMovement[]> => {
    return await http.get(`/cash/sessions/${sessionId}/movements`);
  },

  addMovement: async (sessionId: string, dto: CreateMovementDto): Promise<CashMovement> => {
    return await http.post(`/cash/sessions/${sessionId}/movements`, dto);
  },

  // Özet
  getSessionSummary: async (sessionId: string): Promise<CashSummaryData> => {
    return await http.get(`/cash/sessions/${sessionId}/summary`);
  },

  getSessionHistory: async (filters?: {
    startDate?: string;
    endDate?: string;
    registerId?: string;
    status?: CashSessionStatus;
  }): Promise<CashSession[]> => {
    const params = new URLSearchParams();
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    if (filters?.registerId) params.append('registerId', filters.registerId);
    if (filters?.status) params.append('status', filters.status);
    return await http.get(`/cash/sessions/history?${params.toString()}`);
  },
};
```

#### 1.3 Socket Event Yönetimi (YENİ)

```typescript
// web/modules/cash/socket.ts

export enum CashSocketEvents {
  CASH_MOVEMENT_CREATED = 'CASH_MOVEMENT_CREATED',
  CASH_SESSION_OPENED = 'CASH_SESSION_OPENED',
  CASH_SESSION_CLOSED = 'CASH_SESSION_CLOSED',
  CASH_BALANCE_UPDATED = 'CASH_BALANCE_UPDATED',
  TIP_RECEIVED = 'TIP_RECEIVED',  // YENİ: Bahşiş geldi event'i
}

// Socket event callback tipi
export type CashEventCallback = (data: {
  sessionId: string;
  restaurantId: string;
  movementId?: string;
  newBalance?: number;
  tipAmount?: number;  // YENİ
  tipMethod?: 'cash' | 'card';  // YENİ
}) => void;
```

```typescript
// web/modules/cash/hooks/useCashSocket.ts
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { CashSocketEvents } from '../socket';

export function useCashSocket(restaurantId: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const handleMovementCreated = (data: any) => {
      // React Query cache invalidate et
      queryClient.invalidateQueries({ queryKey: ['cash-balance'] });
      queryClient.invalidateQueries({ queryKey: ['cash-movements'] });
      queryClient.invalidateQueries({ queryKey: ['cash-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['cash-summary'] });
    };

    // socket.on(CashSocketEvents.CASH_MOVEMENT_CREATED, handleMovementCreated);
    // socket.on(CashSocketEvents.TIP_RECEIVED, handleMovementCreated);

    return () => {
      // Cleanup
      // socket.off(CashSocketEvents.CASH_MOVEMENT_CREATED, handleMovementCreated);
    };
  }, [restaurantId, queryClient]);
}
```

#### 1.4 Klasör Yapısını Oluştur
```bash
mkdir -p web/modules/cash/{components,hooks,utils}
```

#### 1.5 frontend/modules/cash/service.ts Sil
Taşıma tamamlandıktan sonra eski dosyayı kaldır.

---

### Aşama 2: UI Bileşenleri

#### 2.1 CashSummaryCard - Kasa Özeti Kartı (YENİ - 3'lü Yapı)

```typescript
// web/modules/cash/components/CashSummaryCard.tsx
'use client';

import { ArrowUpRight, ArrowDownRight, Wallet, Banknote, CreditCard } from 'lucide-react';
import { CashSummaryData } from '../types';
import { formatCurrency } from '@/modules/shared/utils/numeric';

interface CashSummaryCardProps {
  summary: CashSummaryData;
  isLoading?: boolean;
}

export function CashSummaryCard({ summary, isLoading }: CashSummaryCardProps) {
  const { netSales, totalTips, totalCash, cashTips, cardTips } = summary;

  if (isLoading) {
    return <div className="animate-pulse h-32 bg-bg-muted rounded-sm" />;
  }

  return (
    <div className="grid grid-cols-3 gap-4">
      {/* Net Satış (Ciro) */}
      <div className="p-4 bg-success-main/5 border border-success-main/20 rounded-sm">
        <div className="flex items-center gap-2 mb-2">
          <ArrowUpRight className="h-4 w-4 text-success-main" />
          <span className="text-xs font-semibold text-success-main uppercase">
            Net Satış
          </span>
        </div>
        <span className="text-2xl font-black text-success-main">
          {formatCurrency(netSales)}
        </span>
        <span className="text-xs text-text-muted block mt-1">Ciro</span>
      </div>

      {/* Toplam Bahşiş */}
      <div className="p-4 bg-primary-main/5 border border-primary-main/20 rounded-sm">
        <div className="flex items-center gap-2 mb-2">
          <Banknote className="h-4 w-4 text-primary-main" />
          <span className="text-xs font-semibold text-primary-main uppercase">
            Toplam Bahşiş
          </span>
        </div>
        <span className="text-2xl font-black text-primary-main">
          {formatCurrency(totalTips)}
        </span>
        <div className="flex gap-2 mt-1">
          <span className="text-xs text-text-muted">
            Nakit: {formatCurrency(cashTips)}
          </span>
          <span className="text-text-muted">|</span>
          <span className="text-xs text-text-muted">
            Kart: {formatCurrency(cardTips)}
          </span>
        </div>
      </div>

      {/* Kasa Toplamı (Fiziksel) */}
      <div className="p-4 bg-warning-main/5 border border-warning-main/20 rounded-sm">
        <div className="flex items-center gap-2 mb-2">
          <Wallet className="h-4 w-4 text-warning-main" />
          <span className="text-xs font-semibold text-warning-main uppercase">
            Kasa Toplamı
          </span>
        </div>
        <span className="text-2xl font-black text-warning-main">
          {formatCurrency(totalCash)}
        </span>
        <span className="text-xs text-text-muted block mt-1">
          Nakit + Nakit Bahşiş
        </span>
      </div>
    </div>
  );
}
```

#### 2.2 CashOpenModal - Kasa Açılış Modalı

```typescript
// web/modules/cash/components/CashOpenModal.tsx
'use client';

import { useState } from 'react';
import { Banknote, X } from 'lucide-react';
import { Button } from '@/modules/shared/components/Button';
import { Modal } from '@/modules/shared/components/Modal';
import { parseNumericValue } from '@/modules/shared/utils/numeric';

interface CashOpenModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { openingBalance: number; notes?: string }) => void;
  isLoading?: boolean;
}

export function CashOpenModal({ isOpen, onClose, onSubmit, isLoading }: CashOpenModalProps) {
  const [openingBalance, setOpeningBalance] = useState('');
  const [notes, setNotes] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      openingBalance: parseNumericValue(openingBalance),
      notes: notes || undefined,
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="bg-bg-surface rounded-sm border border-border-light p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-text-primary">Kasa Oturumu Aç</h2>
          <button onClick={onClose} className="p-1 hover:bg-bg-hover rounded">
            <X className="h-5 w-5 text-text-muted" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-text-secondary uppercase block mb-2">
              Açılış Bakiyesi
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Banknote className="h-5 w-5 text-text-muted" />
              </div>
              <input
                type="text"
                value={openingBalance}
                onChange={(e) => setOpeningBalance(e.target.value)}
                placeholder="0,00"
                className="w-full pl-10 pr-4 py-3 text-xl font-bold text-right bg-bg-muted border border-border-light rounded-sm focus:outline-none focus:border-primary-main"
                required
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-lg font-semibold text-text-muted">
                TL
              </span>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-text-secondary uppercase block mb-2">
              Notlar (Opsiyonel)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Kasa açılışı ile ilgili notlar..."
              rows={3}
              className="w-full px-4 py-3 bg-bg-muted border border-border-light rounded-sm focus:outline-none focus:border-primary-main resize-none"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
              İptal
            </Button>
            <Button type="submit" variant="primary" isLoading={isLoading} className="flex-1">
              Kasayı Aç
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
```

#### 2.3 CashCloseModal - Kasa Kapanış Modalı (Kör Sayım + Personel Bahşiş)

```typescript
// web/modules/cash/components/CashCloseModal.tsx
'use client';

import { useState } from 'react';
import { Coins, CreditCard, X, AlertTriangle, Banknote } from 'lucide-react';
import { Button } from '@/modules/shared/components/Button';
import { Modal } from '@/modules/shared/components/Modal';
import { parseNumericValue, formatCurrency } from '@/modules/shared/utils/numeric';
import { DenominationTable } from './DenominationTable';

interface CashCloseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    countedBalance: number;
    creditCardTotal: number;
    denominations?: DenominationEntry[];
    notes?: string;
    distributeCardTips?: boolean;
    cardTipsToDistribute?: number;
  }) => void;
  expectedBalance: number;
  cardTipsToday: number;    // YENİ: Bugün kartla alınan bahşiş
  isLoading?: boolean;
}

export function CashCloseModal({
  isOpen,
  onClose,
  onSubmit,
  expectedBalance,
  cardTipsToday,
  isLoading,
}: CashCloseModalProps) {
  const [countedBalance, setCountedBalance] = useState('');
  const [creditCardTotal, setCreditCardTotal] = useState('');
  const [showDenomination, setShowDenomination] = useState(false);
  const [denominations, setDenominations] = useState<DenominationEntry[]>([]);
  const [notes, setNotes] = useState('');
  const [distributeCardTips, setDistributeCardTips] = useState(false); // YENİ

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      countedBalance: parseNumericValue(countedBalance),
      creditCardTotal: parseNumericValue(creditCardTotal),
      denominations: showDenomination ? denominations : undefined,
      notes: notes || undefined,
      distributeCardTips,
      cardTipsToDistribute: distributeCardTips ? cardTipsToday : 0,
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="bg-bg-surface rounded-sm border border-border-light p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-text-primary">Kasayı Kapat ve Raporla</h2>
          <button onClick={onClose} className="p-1 hover:bg-bg-hover rounded">
            <X className="h-5 w-5 text-text-muted" />
          </button>
        </div>

        {/* Uyarı - Kör Sayım */}
        <div className="mb-6 p-4 bg-warning-main/10 border border-warning-main/30 rounded-sm">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-warning-main mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-warning-dark">Kör Sayım Uygulanıyor</p>
              <p className="text-xs text-text-secondary mt-1">
                Sistemin size söylemesini beklemeyin. Elinizdeki nakiti sayarak giriniz.
              </p>
            </div>
          </div>
        </div>

        {/* YENİ: Personel Bahşiş Uyarısı */}
        {cardTipsToday > 0 && (
          <div className="mb-6 p-4 bg-primary-main/10 border border-primary-main/30 rounded-sm">
            <div className="flex items-start gap-3">
              <Banknote className="h-5 w-5 text-primary-main mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-primary-dark">
                  Kartla Toplanan Bahşiş
                </p>
                <p className="text-2xl font-black text-primary-main mt-1">
                  {formatCurrency(cardTipsToday)}
                </p>
                <p className="text-xs text-text-secondary mt-1">
                  Bu tutarı kasadan personele dağıtacak mısınız?
                </p>
                
                {/* Dağıtım Seçeneği */}
                <label className="flex items-center gap-2 mt-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={distributeCardTips}
                    onChange={(e) => setDistributeCardTips(e.target.checked)}
                    className="w-4 h-4 rounded border-primary-main text-primary-main"
                  />
                  <span className="text-sm text-text-primary">
                    Bahşişi kasadan dağıt
                  </span>
                </label>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Fiili Nakit Tutarı */}
          <div>
            <label className="text-xs font-semibold text-text-secondary uppercase block mb-2">
              Fiili Nakit Tutarı
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Coins className="h-5 w-5 text-text-muted" />
              </div>
              <input
                type="text"
                value={countedBalance}
                onChange={(e) => setCountedBalance(e.target.value)}
                placeholder="0,00"
                className="w-full pl-10 pr-4 py-3 text-xl font-bold text-right bg-bg-muted border border-border-light rounded-sm focus:outline-none focus:border-primary-main"
                required
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-lg font-semibold text-text-muted">
                TL
              </span>
            </div>
          </div>

          {/* Kredi Kartı Slip Toplamı */}
          <div>
            <label className="text-xs font-semibold text-text-secondary uppercase block mb-2">
              Kredi Kartı Slip Toplamı
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <CreditCard className="h-5 w-5 text-text-muted" />
              </div>
              <input
                type="text"
                value={creditCardTotal}
                onChange={(e) => setCreditCardTotal(e.target.value)}
                placeholder="0,00"
                className="w-full pl-10 pr-4 py-3 text-xl font-bold text-right bg-bg-muted border border-border-light rounded-sm focus:outline-none focus:border-primary-main"
                required
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-lg font-semibold text-text-muted">
                TL
              </span>
            </div>
          </div>

          {/* Denomination Toggle */}
          <button
            type="button"
            onClick={() => setShowDenomination(!showDenomination)}
            className="text-xs text-primary-main hover:underline"
          >
            {showDenomination ? '▼ Banknot detaylarını gizle' : '▶ Banknot bazlı sayım yap'}
          </button>

          {showDenomination && (
            <DenominationTable value={denominations} onChange={setDenominations} />
          )}

          {/* Notlar */}
          <div>
            <label className="text-xs font-semibold text-text-secondary uppercase block mb-2">
              Kapanış Notları
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full px-4 py-3 bg-bg-muted border border-border-light rounded-sm focus:outline-none focus:border-primary-main resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
              İptal
            </Button>
            <Button type="submit" variant="primary" isLoading={isLoading} className="flex-1">
              Oturumu Sonlandır
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
```

#### 2.4 DenominationTable - Banknot Sayım Tablosu

```typescript
// web/modules/cash/components/DenominationTable.tsx
'use client';

import { useState, useEffect } from 'react';
import { DenominationEntry } from '../types';

const DEFAULT_DENOMINATIONS = [200, 100, 50, 20, 10, 5, 1, 0.5];

interface DenominationTableProps {
  value: DenominationEntry[];
  onChange: (value: DenominationEntry[]) => void;
}

export function DenominationTable({ value, onChange }: DenominationTableProps) {
  const [entries, setEntries] = useState<DenominationEntry[]>(
    value.length > 0
      ? value
      : DEFAULT_DENOMINATIONS.map((d) => ({ denomination: d, count: 0 }))
  );

  useEffect(() => {
    onChange(entries);
  }, [entries, onChange]);

  const updateCount = (denomination: number, count: number) => {
    setEntries((prev) =>
      prev.map((e) =>
        e.denomination === denomination ? { ...e, count: Math.max(0, count) } : e
      )
    );
  };

  const total = entries.reduce((sum, e) => sum + e.denomination * e.count, 0);

  return (
    <div className="space-y-3 p-4 bg-bg-muted rounded-sm border border-border-light">
      <div className="grid grid-cols-3 gap-2 text-xs font-semibold text-text-secondary uppercase">
        <span>Banknot</span>
        <span className="text-center">Adet</span>
        <span className="text-right">Toplam</span>
      </div>

      {entries.map((entry) => (
        <div key={entry.denomination} className="grid grid-cols-3 gap-2 items-center">
          <span className="text-sm font-medium">
            ₺{entry.denomination.toFixed(entry.denomination < 1 ? 2 : 0)}
          </span>
          <input
            type="number"
            min="0"
            value={entry.count || ''}
            onChange={(e) => updateCount(entry.denomination, parseInt(e.target.value) || 0)}
            className="px-2 py-1 text-center bg-bg-surface border border-border-light rounded-sm focus:outline-none focus:border-primary-main"
          />
          <span className="text-sm font-bold text-right">
            ₺{(entry.denomination * entry.count).toFixed(2)}
          </span>
        </div>
      ))}

      <div className="pt-3 border-t border-border-light flex justify-between">
        <span className="text-sm font-semibold">Toplam:</span>
        <span className="text-lg font-black text-primary-main">₺{total.toFixed(2)}</span>
      </div>
    </div>
  );
}
```

#### 2.5 CashDashboard Bileşeni

```typescript
// web/modules/cash/components/CashDashboard.tsx
// - Açık kasa oturumlarını göster
// - Toplam nakit durumunu göster (CashSummaryCard)
// - Nakit akışı grafiği (CashFlowChart)
// - Hızlı hareket ekleme butonları
```

#### 2.6 CashMovementForm Bileşeni

```typescript
// - Hareket türü seçimi (in/out)
// - Alt tür seçimi (regular/tip/refund)
// - Miktar girişi
// - Açıklama alanı
// - isLiquid, isRevenue bayrakları
```

---

### Aşama 3: Ödeme Modülü Entegrasyonu

#### 3.1 PaymentModal → CashMovement Entegrasyonu (Güncellendi)

```typescript
// web/modules/orders/hooks/usePayment.ts
// Ödeme başarılı olduğunda cash movement oluştur

const handlePaymentSuccess = async (paymentData: {
  order_id: string;
  amount: number;
  tip_amount?: number;
  payment_method: PaymentMethod;
  net_tip_amount?: number;  // Komisyon düşülmüş net bahşiş
}) => {
  const activeSession = await cashApi.getAllActiveSessions();
  if (!activeSession) return;

  // 1. SATIŞ HAREKETİ (Ciro) - isRevenue = true
  await cashApi.addMovement(activeSession.id, {
    type: CashMovementType.SALE,
    subtype: CashMovementSubtype.REGULAR,
    paymentMethod: paymentData.payment_method,
    amount: paymentData.amount,
    isLiquid: paymentData.payment_method === PaymentMethod.CASH, // Nakit = true
    isRevenue: true, // Ciro olarak kaydet
    description: `Sipariş #${paymentData.order_id} Satış`,
    orderId: paymentData.order_id,
  });

  // 2. BAHŞİŞ HAREKETİ (Ayrı) - isRevenue = false
  if (paymentData.tip_amount && paymentData.tip_amount > 0) {
    await cashApi.addMovement(activeSession.id, {
      type: CashMovementType.IN, // Giriş
      subtype: CashMovementSubtype.TIP,
      paymentMethod: paymentData.payment_method,
      amount: paymentData.net_tip_amount || paymentData.tip_amount,
      isLiquid: paymentData.payment_method === PaymentMethod.CASH, // Nakit = true, Kart = false
      isRevenue: false, // Emanet/Liability olarak kaydet (ciroya dahil değil!)
      description: `Sipariş #${paymentData.order_id} Bahşiş`,
      orderId: paymentData.order_id,
    });
  }
};
```

#### 3.2 Expected Balance Hesaplama (Güncellendi)

```typescript
// web/modules/cash/utils/cash-calculations.ts

/**
 * Beklenen bakiyeyi hesapla
 * ÖNEMLİ: Sadece LİKİD (nakit) hareketler dahil edilir
 * - Nakit satış → dahil
 * - Nakit bahşiş → dahil
 * - Kart satış → HARİÇ (fiziksel kasada yok)
 * - Kart bahşiş → HARİÇ (fiziksel kasada yok)
 */
export function calculateExpectedBalance(session: CashSession, movements: CashMovement[]): number {
  // Başlangıç bakiyesi
  let balance = session.openingBalance;

  for (const movement of movements) {
    // Sadece likid (nakit) hareketleri dahil et
    if (!movement.isLiquid) continue;

    if (movement.type === CashMovementType.SALE || movement.type === CashMovementType.IN) {
      balance += movement.amount; // Giriş
    } else if (movement.type === CashMovementType.OUT) {
      balance -= movement.amount; // Çıkış
    }
  }

  return balance;
}

/**
 * Ciroyu hesapla (sadece isRevenue = true olanlar)
 */
export function calculateRevenue(movements: CashMovement[]): number {
  return movements
    .filter(m => m.isRevenue && m.type === CashMovementType.SALE)
    .reduce((sum, m) => sum + m.amount, 0);
}

/**
 * Toplam bahşişi hesapla (isRevenue = false, subtype = TIP)
 */
export function calculateTotalTips(movements: CashMovement[]): number {
  return movements
    .filter(m => m.subtype === CashMovementSubtype.TIP)
    .reduce((sum, m) => sum + m.amount, 0);
}

/**
 * Likid toplamı (nakit + nakit bahşiş)
 */
export function calculateLiquidTotal(movements: CashMovement[]): number {
  return movements
    .filter(m => m.isLiquid)
    .reduce((sum, m) => sum + m.amount, 0);
}
```

---

### Aşama 4: Route'lar

#### 4.1 Sidebar Güncelleme

```typescript
// Sidebar.tsx'e eklenecek
{
  label: 'Kasa',
  href: '/cash',
  icon: <CashIcon />,
}
```

#### 4.2 Sayfa Route'ları

```
web/app/(main)/cash/
├── page.tsx              # Ana kasa sayfası
├── registers/page.tsx   # Kasa yönetimi
├── sessions/page.tsx    # Oturum geçmişi
└── [sessionId]/page.tsx # Oturum detayı
```

---

## Güvenlik ve Loglama Kuralları

### Immutable Logs
- CashMovement kayıtları **asla** silinemez (soft delete dahil)
- Hata düzeltmesi için ters işlem (zıt miktar) girilir
- Tüm hareketler `created_by` bilgisini tutar

### User Tracking

```typescript
interface CashMovement {
  userId: string;
  createdAt: string;
  originalMovementId?: string;
  correctionType?: 'reversal' | 'adjustment';
}
```

---

## Test Senaryoları

### Tip Kontrolleri
- [ ] `npm run build` başarılı olmalı
- [ ] TypeScript compiler hata vermemeli

### Manuel Testler
- [ ] Kasa listesi API'sine istek atılabilmeli
- [ ] Yeni kasa oluşturulabilmeli
- [ ] Kasa oturumu açılabilmeli (CashOpenModal)
- [ ] Kasa oturumu kapatılabilmeli (CashCloseModal - kör sayım)
- [ ] Hareket eklenebilmeli
- [ ] Denomination table doğru hesaplıyor mu?

### Entegrasyon Testleri
- [ ] Sidebar'dan kasa sayfasına erişim
- [ ] Nakit ödeme sonrası CashMovement oluşuyor (isRevenue: true)
- [ ] Bahşiş ayrı hareket olarak kaydediliyor (isRevenue: false)
- [ ] Kart ödemesi → isLiquid: false (kasaya girmiyor)
- [ ] Socket event geldiğinde balance güncelleniyor

### Kör Sayım Testleri
- [ ] Sistem beklenen tutarı göstermiyor (kör sayım)
- [ ] Fark (difference) doğru hesaplanıyor

### Bahşiş Testleri
- [ ] CashSummaryCard 3'lü yapı gösteriyor (Net Satış, Bahşiş, Kasa)
- [ ] Kartla alınan bahşiş, kasadaki parayı etkilemiyor
- [ ] CashCloseModal'da kart bahşiş raporu gösteriliyor
- [ ] Personel bahşiş dağıtımı seçeneği çalışıyor

---

## Notlar

1. **Backend Uyumu**: Backend'de zaten tam bir cash modülü var. Frontend sadece bu API'leri kullanacak.

2. **Socket Stratejisi**: Tüm veriyi socket üzerinden göndermek yerine sadece "trigger" (event) gönderilir. İstemci tarafında React Query `invalidateQueries` ile veri çekilir.

3. **Ciro vs Bahşiş Ayrımı**:
   - Satış → `isRevenue: true` (Ciro olarak kaydedilir)
   - Bahşiş → `isRevenue: false` (Liability/Emanet olarak kaydedilir)

4. **Likidite Kontrolü**:
   - Nakit satış + Nakit bahşiş → `isLiquid: true` → Kasaya girer
   - Kart satış + Kart bahşiş → `isLiquid: false` → Kasaya GİRMEZ

5. **Kör Sayım**: Kasa kapatılırken sistem personele "olması gereken tutarı" söylemez. Personel elindekini sayar, sistem farkı hesaplar.

6. **Personel Bahşiş**: Kasa kapanışında kartla alınan toplam bahşiş raporlanır ve dağıtım için sorulur.

---

## Bağımlılıklar

- `@/modules/shared/api/http` - HTTP istemcisi
- `@/modules/shared/components/*` - Ortak UI bileşenleri (Modal, Button)
- `@/modules/shared/utils/numeric.ts` - formatCurrency, parseNumericValue
- `lucide-react` - İkonlar
- Backend `cash` modülü çalışır durumda olmalı
- Socket altyapısı
