# Inventory Module DRY Refactoring Plan

## Overview

This document outlines the refactoring plan to bring the inventory module in full compliance with DRY (Don't Repeat Yourself) standards. The plan leverages the shared components created for the products module and identifies additional patterns specific to inventory management.

---

## Current State Analysis

### Files in Inventory Module

| File | Current Issues |
|------|---------------|
| [`IngredientForm.tsx`](web/modules/inventory/components/IngredientForm.tsx) | Hardcoded labels, inline select styling, duplicate form patterns |
| [`StockMovementForm.tsx`](web/modules/inventory/components/StockMovementForm.tsx) | Hardcoded labels, inline styles repeated |
| [`StockTable.tsx`](web/modules/inventory/components/StockTable.tsx) | Table styling hardcoded, stock status badges repeated |
| [`MovementHistory.tsx`](web/modules/inventory/components/MovementHistory.tsx) | Table styling duplicated from StockTable, formatDate repeated |
| [`InventoryClient.tsx`](web/modules/inventory/components/InventoryClient.tsx) | Hardcoded header styles, filters panel needs enhancement with stock status filter |

### Code Duplication Found

1. **Label Styles** - Repeated 8+ times across components (text-[10px], font-bold, uppercase, etc.)
2. **Table Headers** - Same styling repeated in StockTable and MovementHistory
3. **Stock Status Badges** - Status indicators (YETERLİ, KRİTİK, STOK YOK) repeated
4. **Movement Type Styling** - Color classes for IN/OUT/ADJUST repeated
5. **Form Layouts** - Grid patterns repeated across forms
6. **Empty States** - Similar empty state designs repeated
7. **formatDate Function** - Defined in MovementHistory, could be centralized
8. **Search & Filter Pattern** - Products has better filtering (category, stock status), Inventory needs same

---

## Components to Reuse from Shared

The following components created for products module are available for inventory:

1. **[`FormInput.tsx`](web/modules/shared/components/FormInput.tsx)** - Unified form inputs
2. **[`RmsSwitch.tsx`](web/modules/shared/components/RmsSwitch.tsx)** - Toggle switches
3. **[`FormSection.tsx`](web/modules/shared/components/FormSection.tsx)** - Section wrappers
4. **[`numeric.ts`](web/modules/shared/utils/numeric.ts)** - Numeric formatting

---

## NEW: Filter Components to Create

Based on products module patterns, we'll create reusable filter components:

### 1. SearchInput.tsx - Reusable Search Component

**Location:** `web/modules/shared/components/SearchInput.tsx`

**Purpose:** Standardized search input with icon and debounce support.

**Interface:**
```typescript
interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  debounceMs?: number;
}
```

---

### 2. FilterPanel.tsx - Reusable Filter Container

**Location:** `web/modules/shared/components/FilterPanel.tsx`

**Purpose:** Standardized filter panel container.

**Interface:**
```typescript
interface FilterPanelProps {
  children: React.ReactNode;
  onReset?: () => void;
  showReset?: boolean;
}
```

---

### 3. FilterSelect.tsx - Filter Dropdown

**Location:** `web/modules/shared/components/FilterSelect.tsx`

**Purpose:** Standardized filter dropdown.

**Interface:**
```typescript
interface FilterSelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}
```

---

### 4. CategoryTabs.tsx (Already exists in products) - Move to Shared

**Location:** `web/modules/shared/components/CategoryTabs.tsx`

**Purpose:** Move from products to shared for reuse in inventory.

---

## New Components Specific to Inventory

### 5. StockStatusBadge.tsx - Stock Status Indicator

**Location:** `web/modules/shared/components/StockStatusBadge.tsx`

**Purpose:** Centralize stock status indicator badges.

**Interface:**
```typescript
type StockStatus = 'in_stock' | 'critical' | 'out_of_stock';

interface StockStatusBadgeProps {
  status: StockStatus;
  showLabel?: boolean;
  size?: 'sm' | 'md';
}
```

---

### 6. MovementTypeBadge.tsx - Movement Type Indicator

**Location:** `web/modules/shared/components/MovementTypeBadge.tsx`

**Purpose:** Centralize movement type indicators (GİRİŞ, ÇIKIŞ, DÜZELTME).

**Interface:**
```typescript
type MovementType = 'IN' | 'OUT' | 'ADJUST';

interface MovementTypeBadgeProps {
  type: MovementType;
  size?: 'sm' | 'md';
}
```

---

### 7. EmptyState.tsx - Reusable Empty State

**Location:** `web/modules/shared/components/EmptyState.tsx`

**Purpose:** Standardize empty state displays.

**Interface:**
```typescript
interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}
```

---

### 8. date.ts - Date Formatting Utilities

**Location:** `web/modules/shared/utils/date.ts`

**Purpose:** Centralize date formatting functions.

**Functions:**
```typescript
export const formatDate = (date: string | number | Date) => string;
export const formatDateTime = (date: string | number | Date) => string;
export const formatRelativeTime = (date: string | number | Date) => string;
```

---

## Inventory Enhancements (Adding Products-Style Filtering)

### Current Inventory Filtering (Basic)
- Search by name only
- Toggle between list/movements view

### Target Inventory Filtering (Enhanced)
- Search by name
- Filter by stock status (all, in_stock, critical, out_of_stock)
- Filter by movement type (all, IN, OUT, ADJUST)
- Date range filter for movements

---

## Refactoring Steps

### Phase 1: Create Additional Shared Components

```
[ ] Create web/modules/shared/components/SearchInput.tsx
[ ] Create web/modules/shared/components/FilterPanel.tsx
[ ] Create web/modules/shared/components/FilterSelect.tsx
[ ] Move web/modules/shared/components/CategoryTabs.tsx (from products)
[ ] Create web/modules/shared/components/StockStatusBadge.tsx
[ ] Create web/modules/shared/components/MovementTypeBadge.tsx
[ ] Create web/modules/shared/components/EmptyState.tsx
[ ] Create web/modules/shared/utils/date.ts
```

### Phase 2: Update Inventory Components

```
[ ] Update IngredientForm.tsx to use FormInput
[ ] Update StockMovementForm.tsx to use FormInput and MovementTypeBadge
[ ] Update StockTable.tsx to use StockStatusBadge and EmptyState
[ ] Update MovementHistory.tsx to use MovementTypeBadge, date utils, and EmptyState
[ ] Update InventoryClient.tsx to add stock status filter (like products)
```

---

## File Structure After Refactoring

```
web/modules/shared/
├── components/
│   ├── FormInput.tsx           # Existing
│   ├── RmsSwitch.tsx          # Existing
│   ├── AddIngredientModal.tsx  # Existing
│   ├── FormSection.tsx         # Existing
│   ├── SearchInput.tsx         # NEW
│   ├── FilterPanel.tsx         # NEW
│   ├── FilterSelect.tsx        # NEW
│   ├── CategoryTabs.tsx        # NEW - moved from products
│   ├── StockStatusBadge.tsx    # NEW
│   ├── MovementTypeBadge.tsx   # NEW
│   ├── EmptyState.tsx          # NEW
│   └── ...
├── utils/
│   ├── numeric.ts              # Existing
│   ├── date.ts                 # NEW
│   └── cn.ts                  # Existing
└── ...

web/modules/inventory/
├── components/
│   ├── IngredientForm.tsx      # UPDATE - Use FormInput
│   ├── StockMovementForm.tsx    # UPDATE - Use FormInput, MovementTypeBadge
│   ├── StockTable.tsx          # UPDATE - Use StockStatusBadge, EmptyState
│   ├── MovementHistory.tsx      # UPDATE - Use MovementTypeBadge, date utils, EmptyState
│   └── InventoryClient.tsx      # UPDATE - Add stock status filter
└── types.ts                     # UPDATE - Import from shared if needed
```

---

## Benefits

| Benefit | Description |
|---------|-------------|
| **Reduced Code** | ~200+ lines of duplication eliminated |
| **Consistency** | All tables, forms, and filters follow identical patterns |
| **Reusability** | Filter components available for all modules |
| **Enhanced UX** | Inventory gets products-style filtering |
| **Maintainability** | Single source of truth for each pattern |
| **Testability** | Each component can be tested independently |

---

## Backward Compatibility

- Existing Input.tsx and Button components remain for simple cases
- New components are additive - no breaking changes
- All existing functionality preserved
- Inventory filtering is additive (search still works, new filters optional)

---

## Migration Priority

1. **High:** StockStatusBadge - Most visible UI element
2. **High:** MovementTypeBadge - Repeated 4+ times
3. **High:** SearchInput, FilterPanel, FilterSelect - Products pattern
4. **Medium:** EmptyState - Used in 2 components
5. **Medium:** date utilities - Used in MovementHistory
6. **Medium:** InventoryClient enhancement - Add stock status filter
