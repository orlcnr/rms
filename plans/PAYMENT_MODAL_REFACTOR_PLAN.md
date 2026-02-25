# PaymentModal Refactor Plan

## Current State
- **File**: `web/modules/orders/components/PaymentModal.tsx`
- **Size**: ~25,000 characters (very large)
- **Problem**: All components (PaymentLineItem, MobilePaymentSheet, QuickNumPad, etc.) are defined in a single file

## Goals
1. Reduce file size by 50%
2. Improve readability
3. Extract reusable sub-components
4. Follow DRY principles

---

## Updated Target Structure

### Option A: Shared UI (Recommended for Reusable Components)
If PaymentSummary or PaymentMethodSelector will be used in "Müşteri Paneli" or "Kurye Uygulaması" in the future:

```
web/modules/shared/components/payment/
├── PaymentMethodSelector.tsx  # Ödeme yöntemi butonları (REUSABLE)
├── PaymentSummaryCard.tsx    # Özet kartı (REUSABLE) - zaten var
└── payment.config.ts         # Ödeme yöntemi konfigürasyonu
```

```
web/modules/orders/components/payment/
├── PaymentModal.tsx          # Ana orkestratör (150 satır)
├── PaymentLineList.tsx       # Ödeme satırları container
├── PaymentLineItem.tsx       # Tek ödeme satırı
├── MobileNumpadOverlay.tsx  # Mobil numpad
└── hooks/
    └── usePaymentModal.ts    # Paylaşılan mantık
```

### Option B: Module-Local (For Order-Specific Components)
```
web/modules/orders/components/payment/
├── PaymentModal.tsx
├── PaymentLineList.tsx
├── PaymentLineItem.tsx
├── PaymentMethodSelector.tsx  # Sadece orders modülünde kullanılır
├── payment.config.ts         # Konfigürasyon
├── MobileNumpadOverlay.tsx
└── hooks/
    └── usePaymentModal.ts
```

---

## Config File (NEW)

### `payment.config.ts` - Centralized Payment Method Configuration

```typescript
// web/modules/shared/components/payment/payment.config.ts

import { PaymentMethod } from '@/modules/orders/types';
import { 
  Banknote, 
  CreditCard, 
  Smartphone, 
  Building, 
  User 
} from 'lucide-react';

export interface PaymentMethodConfig {
  icon: React.ComponentType<any>;
  label: string;
  color: string;
  bgColor: string;
}

export const PAYMENT_METHOD_CONFIG: Record<PaymentMethod, PaymentMethodConfig> = {
  [PaymentMethod.CASH]: {
    icon: Banknote,
    label: 'Nakit',
    color: 'text-success-main',
    bgColor: 'bg-success-main'
  },
  [PaymentMethod.CREDIT_CARD]: {
    icon: CreditCard,
    label: 'Kredi Kartı',
    color: 'text-info-main',
    bgColor: 'bg-info-main'
  },
  [PaymentMethod.DEBIT_CARD]: {
    icon: CreditCard,
    label: 'Banka Kartı',
    color: 'text-info-main',
    bgColor: 'bg-info-main'
  },
  [PaymentMethod.DIGITAL_WALLET]: {
    icon: Smartphone,
    label: 'Dijital Cüzdan',
    color: 'text-warning-main',
    bgColor: 'bg-warning-main'
  },
  [PaymentMethod.BANK_TRANSFER]: {
    icon: Building,
    label: 'Havale/EFT',
    color: 'text-primary-main',
    bgColor: 'bg-primary-main'
  },
  [PaymentMethod.OPEN_ACCOUNT]: {
    icon: User,
    label: 'Açık Hesap',
    color: 'text-danger-main',
    bgColor: 'bg-danger-main'
  }
};

// Easy to add new methods like Yemeksepeti, Getir
// export const PAYMENT_METHOD_CONFIG: Record<PaymentMethod, PaymentMethodConfig> = {
//   ...PAYMENT_METHOD_CONFIG,
//   [PaymentMethod.YEMEKSEPETI]: { icon: ..., label: 'Yemeksepeti', ... },
//   [PaymentMethod.GETIR]: { icon: ..., label: 'Getir', ... },
// };
```

---

## Internal Context (Optional - For Prop Drilling)

If prop drilling becomes excessive (3-4 levels), create PaymentContext:

```typescript
// web/modules/orders/components/payment/context/PaymentContext.tsx

import { createContext, useContext } from 'react';
import { PaymentLine } from '../../types';

interface PaymentContextValue {
  payments: PaymentLine[];
  isProcessing: boolean;
  handleUpdatePayment: (id: string, updates: Partial<PaymentLine>) => void;
  handleRemovePayment: (id: string) => void;
  handleAddNewCustomer: (name: string) => Promise<Customer | null>;
}

export const PaymentContext = createContext<PaymentContextValue | null>(null);

export function usePaymentContext() {
  const context = useContext(PaymentContext);
  if (!context) {
    throw new Error('usePaymentContext must be used within PaymentProvider');
  }
  return context;
}
```

---

## Step-by-Step Refactoring Plan

### Step 1: Create Config File
**Files to create:**
- `modules/shared/components/payment/payment.config.ts` (if reusable)
- OR `modules/orders/components/payment/payment.config.ts` (if module-local)

### Step 2: Extract PaymentMethodSelector
**Files to create:**
- `components/payment/PaymentMethodSelector.tsx` - Grid of payment method buttons

**What to move:**
- Payment method icons and button grid
- Replace `getMethodIcon` with `PAYMENT_METHOD_CONFIG`

### Step 3: Extract PaymentLineItem
**Files to create/modify:**
- `components/payment/PaymentLineItem.tsx` - Extract PaymentLineItem component
- `components/payment/PaymentModal.tsx` - Import and use extracted component

### Step 4: Extract PaymentSummary
**Files to create:**
- `components/payment/PaymentSummary.tsx` - Summary card component

### Step 5: Extract MobileNumpadOverlay
**Files to create:**
- `components/payment/MobileNumpadOverlay.tsx` - Numeric keypad

### Step 6: Create usePaymentModal Hook
**Files to create:**
- `components/payment/hooks/usePaymentModal.ts` - Shared state and handlers

### Step 7: Simplify Main Component
**Goal:** PaymentModal.tsx should only be an orchestrator

---

## Implementation Details

### 1. PaymentMethodSelector - Using Config

```typescript
// NEW: components/payment/PaymentMethodSelector.tsx
import { PAYMENT_METHOD_CONFIG } from './payment.config';

export function PaymentMethodSelector({
  onAddMethod,
  disabled
}: PaymentMethodSelectorProps) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {Object.entries(PAYMENT_METHOD_CONFIG).map(([method, config]) => (
        <button
          key={method}
          onClick={() => onAddMethod(method)}
          disabled={disabled}
          className="flex flex-col items-center gap-2 p-4 ..."
        >
          <config.icon className={config.color} />
          <span>{config.label}</span>
        </button>
      ))}
    </div>
  );
}
```

### 2. usePaymentModal Hook

```typescript
// NEW: components/payment/hooks/usePaymentModal.ts
import { useState } from 'react';
import { customersApi, Customer } from '@/modules/customers/services/customers.service';
import { toast } from 'sonner';

export function usePaymentModal({ restaurantId, onSuccess }) {
  const [isCreatingCustomer, setIsCreatingCustomer] = useState(false);
  
  const handleAddNewCustomer = async (name: string): Promise<Customer | null> => {
    try {
      setIsCreatingCustomer(true);
      const nameParts = name.trim().split(/\s+/);
      const firstName = nameParts[0] || 'Müşteri';
      const lastName = nameParts.slice(1).join(' ') || 'Yeni';
      const tempPhone = `555${Date.now().toString().slice(-7)}`;
      
      const newCustomer = await customersApi.create({
        first_name: firstName,
        last_name: lastName,
        phone: tempPhone,
      });
      
      toast.success('Müşteri başarıyla oluşturuldu');
      return newCustomer;
    } catch (error) {
      toast.error('Müşteri oluşturulamadı');
      return null;
    } finally {
      setIsCreatingCustomer(false);
    }
  };
  
  return { handleAddNewCustomer, isCreatingCustomer };
}
```

---

## Migration Steps

1. **Backup**: Copy current PaymentModal.tsx to PaymentModal.backup.tsx
2. **Create directory**: Create `components/payment/` folder
3. **Create config**: Add payment.config.ts
4. **Extract components one by one**: Start with PaymentMethodSelector
5. **Test after each extraction**: Ensure nothing breaks
6. **Update imports**: Update all import paths
7. **Clean up**: Remove backup file

---

## Files to Create (Summary)

| File | Description | Estimated Lines | Location |
|------|-------------|------------------|-----------|
| `payment.config.ts` | Konfigürasyon | 30 | shared/ or orders/ |
| `PaymentMethodSelector.tsx` | Method butonları | 60 | shared/ |
| `PaymentModal.tsx` | Ana orkestratör | 150 | orders/ |
| `PaymentLineList.tsx` | Lines container | 80 | orders/ |
| `PaymentLineItem.tsx` | Tek satır | 120 | orders/ |
| `MobileNumpadOverlay.tsx` | Numpad | 100 | orders/ |
| `usePaymentModal.ts` | Hook | 80 | orders/ |

**Total**: ~620 lines (from ~2500 lines = ~75% reduction)

---

## Notes

- **Shared vs Local**: Use Option A (shared) for components that will be reused in Customer Panel or Courier App
- **Context**: Only add PaymentContext if prop drilling becomes excessive
- **Config**: Keeping method configs in one file makes adding new payment methods (Yemeksepeti, Getir) trivial
- Keep all existing functionality
- Maintain backward compatibility with OrdersClient
