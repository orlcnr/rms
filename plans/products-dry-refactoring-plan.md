# Products Module DRY Refactoring Plan

## Overview

This document outlines the refactoring plan to bring the products module in full compliance with DRY (Don't Repeat Yourself) standards. The refactoring will create reusable atomic components that eliminate code duplication and ensure consistency across the application.

---

## Current State Analysis

### Files to be Refactored

| File | Current Issues |
|------|---------------|
| [`ProductGeneralInfo.tsx`](web/modules/products/components/ProductGeneralInfo.tsx) | Hardcoded labels, input styles repeated 3 times |
| [`ProductPricing.tsx`](web/modules/products/components/ProductPricing.tsx) | Toggle logic repeated 2 times, section header duplicated |
| [`RecipeManager.tsx`](web/modules/products/components/RecipeManager.tsx) | Add ingredient modal embedded (276-374 lines), section header duplicated |
| [`ProductCard.tsx`](web/modules/products/components/ProductCard.tsx) | Price formatting not using `formatNumericDisplay` |

### Code Duplication Found

1. **Label Styles** - Repeated 8+ times across components
2. **Input Styles** - Repeated 6+ times with same classes
3. **Section Headers** - Repeated 3 times (GeneralInfo, Pricing, RecipeManager)
4. **Toggle/Switch Components** - Repeated 2 times in ProductPricing
5. **Add Ingredient Modal** - Embedded in RecipeManager (100+ lines)

---

## Refactoring Components

### 1. FormInput.tsx - Unified Form Input Component

**Location:** `web/modules/shared/components/FormInput.tsx`

**Purpose:** Replace all form inputs (text, number, textarea, select, file) with a single standardized component.

**Interface:**
```typescript
type InputType = 'text' | 'number' | 'email' | 'password' | 'tel';

interface FormInputProps {
  // Core
  id: string;
  name: string;
  type?: InputType;
  value: string | number;
  onChange: (value: string) => void;
  
  // Label & Display
  label: string;
  placeholder?: string;
  required?: boolean;
  
  // Styling Variants
  inputMode?: 'text' | 'decimal' | 'numeric';
  textAlign?: 'left' | 'right';
  fontSize?: 'base' | 'lg' | 'xl';
  
  // Validation
  error?: string;
  
  // Select Specific
  options?: Array<{ value: string; label: string }>;
  isSelect?: boolean;
  
  // Textarea Specific
  isTextarea?: boolean;
  rows?: number;
  
  // File Input
  isFile?: boolean;
  accept?: string;
  fileRef?: React.RefObject<HTMLInputElement>;
  onFileChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onFileRemove?: () => void;
  previewUrl?: string | null;
  
  // Misc
  className?: string;
  disabled?: boolean;
}
```

**Features:**
- Standard label with consistent styling (text-[10px], font-semibold, uppercase)
- Focus-visible ring with primary color
- Error state with danger color
- Support for text, number, select, textarea, and file inputs
- Right-aligned numeric inputs support
- File upload with preview

---

### 2. RmsSwitch.tsx - Reusable Toggle Component

**Location:** `web/modules/shared/components/RmsSwitch.tsx`

**Purpose:** Replace hardcoded toggle/switch implementations with a reusable component.

**Interface:**
```typescript
type SwitchTheme = 'success' | 'info' | 'warning' | 'danger' | 'primary';

interface RmsSwitchProps {
  // Core
  checked: boolean;
  onChange: (checked: boolean) => void;
  
  // Display
  label?: string;
  labelOn?: string;    // e.g., "AKTİF"
  labelOff?: string;  // e.g., "PASİF"
  
  // Styling
  theme?: SwitchTheme;
  size?: 'sm' | 'md' | 'lg';
  
  // Behavior
  disabled?: boolean;
  readOnly?: boolean;
  
  // Container
  containerClassName?: string;
}
```

**Features:**
- Multiple themes (success, info, primary, warning, danger)
- Size variants (sm, md, lg)
- Label support with dynamic color based on state
- Smooth animation transitions
- Keyboard accessible

---

### 3. AddIngredientModal.tsx - Extracted Modal Component

**Location:** `web/modules/shared/components/AddIngredientModal.tsx`

**Purpose:** Extract the embedded add ingredient modal from RecipeManager into a standalone reusable component.

**Interface:**
```typescript
interface AddIngredientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (ingredientId: string) => void;
  restaurantId: string;
  
  // Optional pre-filled data
  initialName?: string;
  
  // External loading control
  isLoading?: boolean;
  onSubmit?: (data: CreateIngredientData) => Promise<void>;
}

interface CreateIngredientData {
  name: string;
  unit: string;
  critical_level?: number;
  restaurant_id: string;
}
```

**Features:**
- Fully encapsulated modal logic
- Form validation (name and unit required)
- Unit selection dropdown with standard options
- Optional critical level input
- Loading state handling
- Success callback for parent integration

---

### 4. FormSection.tsx - Section Wrapper Component

**Location:** `web/modules/shared/components/FormSection.tsx`

**Purpose:** Replace repeated section header patterns with a single wrapper component.

**Interface:**
```typescript
type SectionVariant = 'primary' | 'success' | 'info' | 'warning' | 'danger';

interface FormSectionProps {
  // Header
  title: string;
  variant?: SectionVariant;
  
  // Actions (optional buttons on right side)
  actions?: React.ReactNode;
  
  // Content
  children: React.ReactNode;
  
  // Layout
  className?: string;
  contentClassName?: string;
  gridClassName?: string;
  
  // Styling
  showDivider?: boolean;
  dividerClassName?: string;
}
```

**Features:**
- Consistent section header with colored indicator
- Support for action buttons on right side
- Configurable grid layouts
- Divider control
- Multiple color variants matching brand

---

### 5. numeric.ts - Centralized Numeric Utilities

**Location:** `web/modules/shared/utils/numeric.ts`

**Purpose:** Ensure consistent numeric formatting across the entire application.

**Existing Functions (from products/types.ts):**
```typescript
// Already exists - needs to be moved to shared
export const handleNumericInput = (value: string): string => {
    return value.replace(/\./g, '').replace(',', '.');
};

export const formatNumericDisplay = (value: string | number | undefined): string => {
    // Format without thousand separators
    if (value === undefined || value === null || value === '') return '';
    // ... implementation
};

export const formatCurrency = (value: number | undefined): string => {
    if (value === undefined || value === null) return '0,00 ₺';
    return value.toLocaleString('tr-TR', { 
        style: 'currency', 
        currency: 'TRY' 
    });
};
```

**Changes Required:**
- Move `formatNumericDisplay` and `handleNumericInput` from `products/types.ts` to `shared/utils/numeric.ts`
- Add `formatCurrency` function
- Update ProductCard.tsx to use `formatCurrency`
- Update ProductPricing.tsx to use `handleNumericInput`

---

## Implementation Steps

### Phase 1: Create Shared Components

```
[ ] Create web/modules/shared/components/FormInput.tsx
[ ] Create web/modules/shared/components/RmsSwitch.tsx
[ ] Create web/modules/shared/components/AddIngredientModal.tsx
[ ] Create web/modules/shared/components/FormSection.tsx
[ ] Create web/modules/shared/utils/numeric.ts
```

### Phase 2: Update Products Module

```
[ ] Update ProductGeneralInfo.tsx to use FormInput and FormSection
[ ] Update ProductPricing.tsx to use RmsSwitch, FormInput, and FormSection
[ ] Update RecipeManager.tsx to use AddIngredientModal and FormSection
[ ] Update ProductCard.tsx to use formatCurrency from numeric.ts
```

### Phase 3: Update Exports

```
[ ] Update web/modules/shared/components/index.ts exports
[ ] Update types.ts in products to import from shared/utils/numeric.ts
```

---

## File Structure After Refactoring

```
web/modules/shared/
├── components/
│   ├── FormInput.tsx           # NEW - Unified input component
│   ├── RmsSwitch.tsx           # NEW - Toggle/switch component
│   ├── AddIngredientModal.tsx  # NEW - Extracted modal
│   ├── FormSection.tsx         # NEW - Section wrapper
│   ├── Input.tsx               # EXISTING - Keep for simple cases
│   ├── Modal.tsx               # EXISTING - Keep as base
│   ├── Button.tsx              # EXISTING
│   └── index.ts               # UPDATE - Add new exports
├── utils/
│   ├── numeric.ts             # NEW - Numeric formatting
│   └── cn.ts                  # EXISTING
└── ...

web/modules/products/
├── components/
│   ├── ProductGeneralInfo.tsx # UPDATE - Use FormInput, FormSection
│   ├── ProductPricing.tsx      # UPDATE - Use RmsSwitch, FormInput, FormSection
│   ├── RecipeManager.tsx      # UPDATE - Use AddIngredientModal, FormSection
│   ├── ProductCard.tsx        # UPDATE - Use formatCurrency
│   └── ...
└── types.ts                   # UPDATE - Import from shared/utils/numeric.ts
```

---

## Benefits

| Benefit | Description |
|---------|-------------|
| **Reduced Code** | ~200 lines of duplication eliminated |
| **Consistency** | All forms follow identical patterns |
| **Maintainability** | Single source of truth for each component |
| **Reusability** | Components available for other modules |
| **Testability** | Each component can be tested independently |

---

## Backward Compatibility

- Existing `Input.tsx` component will be kept for simple use cases
- New components are additive - no breaking changes to existing code
- ProductForm.tsx interface remains unchanged
- All existing functionality preserved

---

## Migration Priority

1. **High:** FormInput - Used most frequently
2. **High:** RmsSwitch - Visible UI element
3. **Medium:** FormSection - Layout consistency
4. **Medium:** AddIngredientModal - Reduces RecipeManager complexity
5. **Low:** numeric.ts utilities - Internal optimization
