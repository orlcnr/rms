# Orders Module Refactoring Plan

## Executive Summary

This document outlines a comprehensive refactoring plan for the Orders module in the POS (Point of Sale) system. The goal is to improve code quality, maintainability, and separation of concerns by:

1. Extracting business logic from `OrdersClient.tsx` into a custom hook (`useOrdersLogic.ts`)
2. Converting presentational components to pure/stateless components
3. Fixing layout and grid alignment issues
4. Ensuring consistent design token usage

---

## Current State Analysis

### File Structure (Before)
```
web/modules/orders/
├── services.ts              # API calls - OK
├── types.ts                 # TypeScript types - OK
├── hooks/
│   └── usePosStore.ts       # Zustand store - OK (needs no changes)
└── components/
    ├── OrdersClient.tsx     # 392 lines - NEEDS REFACTORING (bloated)
    ├── PosBasket.tsx        # 168 lines - NEEDS CLEANUP (hardcoded colors)
    ├── PosProductGrid.tsx   # 147 lines - NEEDS CLEANUP (hardcoded colors)
    ├── PosProductCard.tsx   # 181 lines - Mostly OK
    ├── PosCategoryTabs.tsx  # 64 lines - NEEDS CLEANUP (hardcoded colors)
    ├── PosSubHeader.tsx     # 47 lines - OK
    └── MobileBasketDrawer.tsx
```

### Issues Identified

#### 1. OrdersClient.tsx - Bloated Component (392 lines)
**Problems:**
- Mixed business logic with UI rendering
- State management: `mounted`, `activeCategoryId`, `searchQuery`, `isBasketOpen`, `page`, `allItems`, `isLoadingMore`
- Filtering logic in `useMemo` (lines 244-254)
- API calls in component body (loadMore function)
- Socket connection logic in `useEffect`
- Basket operations inline
- Hydration guard in component body

**Business Logic to Extract:**
- `mounted` state (hydration guard)
- `activeCategoryId` / `searchQuery` / `page` / `allItems` states
- `isLoadingMore` state
- `filteredItems` computation
- `loadMore` function
- Socket connection handling
- `handleAddToBasket`
- `handleSubmitOrder`

#### 2. Hardcoded Colors (Design Tokens Violations)
Found in multiple files:
- `#F97316` (should be `primary-main`)
- `#EA580C` (should be `primary-hover`)
- `#374151` (should be `text-primary` or `text-secondary`)
- `#1F2937` (should be `text-primary`)
- `#6B7280` (should be `text-muted`)
- `#9CA3AF` (should be `text-muted`)
- `#F5F5F5` / `#EEEEEE` (should be `bg-muted` / `bg-hover`)
- `#E5E7EB` (should be `border-light`)

#### 3. Layout Inconsistencies
- Different padding values: `p-6`, `p-4`, `p-2`
- Different spacing: `gap-6`, `gap-2`, `gap-1`
- No centralized layout constants

---

## Target Architecture

### File Structure (After)
```
web/modules/orders/
├── services.ts              # API calls - UNCHANGED
├── types.ts                 # TypeScript types - UNCHANGED
├── hooks/
│   ├── usePosStore.ts       # Zustand store - UNCHANGED
│   └── useOrdersLogic.ts    # NEW - All business logic
└── components/
    ├── OrdersClient.tsx     # REFACTORED - Orchestrator only
    ├── PosBasket.tsx        # REFACTORED - Pure component
    ├── PosProductGrid.tsx   # REFACTORED - Pure component
    ├── PosProductCard.tsx  # MINOR FIXES - Hardcoded colors
    ├── PosCategoryTabs.tsx  # MINOR FIXES - Hardcoded colors
    ├── PosSubHeader.tsx     # OK
    └── MobileBasketDrawer.tsx
```

### Component Responsibilities

#### OrdersClient.tsx (Orchestrator)
```typescript
// AFTER: Only orchestrates UI components
export function OrdersClient(props) {
  const hook = useOrdersLogic(props)
  
  return (
    <div className="layout-container">
      <PosSubHeader selectedTable={hook.selectedTable} />
      <div className="layout-panels">
        <LeftPanel>
          <SearchBar value={hook.searchQuery} onChange={hook.setSearchQuery} />
          <CategoryTabs categories={hook.categories} activeId={hook.activeCategoryId} />
          <ProductGrid items={hook.filteredItems} onAdd={hook.handleAddToBasket} />
        </LeftPanel>
        <RightPanel>
          <Basket {...hook.basketProps} />
        </RightPanel>
      </div>
    </div>
  )
}
```

#### useOrdersLogic.ts (Business Logic)
```typescript
// AFTER: All logic extracted here
export function useOrdersLogic(props: OrdersClientProps) {
  // State
  const [mounted, setMounted] = useState(false)
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  // ... more state
  
  // Computed
  const filteredItems = useMemo(() => {
    // filtering logic
  }, [allItems, activeCategoryId, searchQuery])
  
  // Handlers (with useCallback)
  const handleAddToBasket = useCallback((product) => {
    // add to basket logic
  }, [...])
  
  const handleSubmitOrder = useCallback(async () => {
    // submit order logic
  }, [...])
  
  // Effects
  useEffect(() => {
    // socket connection
  }, [...])
  
  useEffect(() => {
    // load more observer
  }, [...])
  
  // Return all needed props for UI
  return {
    // State
    mounted,
    activeCategoryId,
    searchQuery,
    filteredItems,
    // Actions
    setActiveCategoryId,
    setSearchQuery,
    handleAddToBasket,
    handleSubmitOrder,
    // Basket
    basket,
    basketSummary,
    // ...
  }
}
```

---

## Phase 1: Extract useOrdersLogic Hook

### 1.1: Create Helper File for Filtering Logic

Create `web/modules/orders/utils/order-filters.ts`:

```typescript
// Order filtering helpers - Pure functions for testability
import { MenuItem } from '@/modules/products/types'

export interface FilterParams {
  items: MenuItem[]
  categoryId: string | null
  searchQuery: string
}

/**
 * Filter menu items by category and search query
 * Pure function - easy to test
 */
export function filterMenuItems({ items, categoryId, searchQuery }: FilterParams): MenuItem[] {
  let filtered = items
  
  // Filter by category
  if (categoryId) {
    filtered = filtered.filter((item) => item.category_id === categoryId)
  }
  
  // Filter by search query
  if (searchQuery.trim()) {
    const query = searchQuery.toLowerCase()
    filtered = filtered.filter((item) => item.name.toLowerCase().includes(query))
  }
  
  // Only available items
  return filtered.filter((item) => item.is_available)
}

/**
 * Group order items by menuItemId
 * Used when loading existing orders into basket
 */
export function groupOrderItemsByMenuItem(items: any[]): Map<string, any> {
  const itemsMap = new Map<string, any>()
  
  items.forEach((item) => {
    const menuItemId = item.menuItem?.id || item.menuItemId
    if (itemsMap.has(menuItemId)) {
      const existing = itemsMap.get(menuItemId)
      existing.quantity += item.quantity || 1
    } else {
      itemsMap.set(menuItemId, {
        menuItemId,
        name: item.menuItem?.name || item.name || 'Ürün',
        price: item.menuItem?.price || item.price || 0,
        image_url: item.menuItem?.image_url,
        quantity: item.quantity || 1,
      })
    }
  })
  
  return itemsMap
}
```

### Step 1.2: Create useOrdersLogic.ts

Create `web/modules/orders/hooks/useOrdersLogic.ts` with:

1. **Hydration Guard**
   - `mounted` state
   - `useEffect` to set mounted

2. **Local State**
   - `activeCategoryId`
   - `searchQuery`
   - `isBasketOpen`
   - `page`
   - `allItems`
   - `isLoadingMore`

3. **Computed Values**
   - `filteredItems` (useMemo)
   - `basket` (from store)
   - `basketSummary` (from store)
   - `hasMore` (pagination check)

4. **Callbacks** (all with useCallback)
   - `setActiveCategoryId`
   - `setSearchQuery`
   - `setIsBasketOpen`
   - `loadMore`
   - `handleAddToBasket`
   - `handleSubmitOrder`

5. **Effects**
   - Initial mount (set mounted, set initial table)
   - Load existing order items
   - Socket connection
   - Intersection observer for load more

### Step 1.2: Refactor OrdersClient.tsx

```typescript
// AFTER: Only UI orchestration
import { useOrdersLogic } from '../hooks/useOrdersLogic'

export function OrdersClient(props) {
  const hook = useOrdersLogic(props)
  
  if (!hook.mounted) return null
  
  return (
    <div className="layout">
      <PosSubHeader selectedTable={hook.selectedTable} />
      <div className="panels">
        <LeftPanel>
          <SearchInput value={hook.searchQuery} onChange={hook.setSearchQuery} />
          <PosCategoryTabs 
            categories={hook.categories}
            activeCategoryId={hook.activeCategoryId}
            onCategoryChange={hook.setActiveCategoryId}
          />
          <PosProductGrid 
            items={hook.filteredItems}
            onAddToBasket={hook.handleAddToBasket}
            basketItems={hook.basket}
          />
        </LeftPanel>
        <RightPanel>
          <PosBasket 
            items={hook.basket}
            selectedTable={hook.selectedTable}
            orderType={hook.orderType}
            onIncrement={hook.incrementItem}
            onDecrement={hook.decrementItem}
            onRemove={hook.removeFromBasket}
            onClear={hook.clearBasket}
            onSubmit={hook.handleSubmitOrder}
            isLoading={hook.isSubmitting}
          />
        </RightPanel>
      </div>
    </div>
  )
}
```

---

## Phase 2: Refactor Presentational Components

### Principles for Stateless Components

1. **No API calls** - All data comes from props
2. **No local state** - All state comes from props
3. **No business logic** - Only rendering logic
4. **Clear TypeScript interfaces** - At top of file
5. **Design tokens only** - No hardcoded colors

### 2.1 PosBasket.tsx Fixes

**Before:**
```typescript
// Hardcoded colors
className="bg-[#F97316] hover:bg-[#EA580C]"
className="text-[#1F2937]"
className="text-[#374151]"
```

**After:**
```typescript
// Design tokens
className="bg-primary-main hover:bg-primary-hover"
className="text-text-primary"
className="text-text-secondary"
```

### 2.2 PosProductGrid.tsx Fixes

**Before:**
```typescript
className="bg-[#F5F5F5] group-hover:bg-[#EEEEEE]"
className="text-[#1F2937]"
className="text-[#6B7280]"
className="text-[#9CA3AF]"
className="border-[#E5E7EB]"
```

**After:**
```typescript
className="bg-bg-muted group-hover:bg-bg-hover"
className="text-text-primary"
className="text-text-muted"
className="border-border-light"
```

### 2.3 PosCategoryTabs.tsx Fixes

**Before:**
```typescript
className="text-[#374151]"
className="border-[#E5E7EB]"
```

**After:**
```typescript
className="text-text-secondary"
className="border-border-light"
```

---

## Phase 3: Layout & Grid Alignment

### 3.1 Create Layout Constants

Add to `types.ts` or create `constants.ts`:

```typescript
// Layout constants for consistent spacing
export const LAYOUT = {
  PADDING: {
    CONTAINER: 'p-6',
    PANEL: 'p-4',
    CARD: 'p-2',
  },
  GAP: {
    LARGE: 'gap-6',
    MEDIUM: 'gap-4',
    SMALL: 'gap-2',
  },
  WIDTH: {
    BASKET_PANEL: '360px',
    BASKET_PANEL_MD: '320px',
  },
  GRID: {
    COLUMNS: {
      MOBILE: 'grid-cols-2',
      TABLET: 'sm:grid-cols-2',
      DESKTOP: 'lg:grid-cols-3',
      XL: 'xl:grid-cols-4',
    },
  },
} as const
```

### 3.2 Fix Grid Alignment

**PosProductGrid.tsx:**
```typescript
// Use consistent grid columns
<div className={cn(
  'grid',
  'grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
  'gap-6',
  'p-6', // Consistent with other panels
  className
)}>
```

### 3.3 Parent Container Alignment

**OrdersClient.tsx:**
```typescript
<div className="flex flex-col h-full">
  {/* Header - consistent padding */}
  <div className="px-6 pt-6 pb-4">
    <PosSubHeader />
  </div>
  
  {/* Main content - flex layout */}
  <div className="flex-1 flex overflow-hidden">
    {/* Left panel - products */}
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Search & Categories - same padding as right panel header */}
      <div className="p-6 pt-0">
        {/* ... */}
      </div>
      
      {/* Product grid */}
      <div className="flex-1 overflow-y-auto p-6 pt-0">
        {/* ... */}
      </div>
    </div>
    
    {/* Right panel - basket */}
    <div className="hidden lg:flex lg:w-[360px]">
      <PosBasket />
    </div>
  </div>
</div>
```

---

## Phase 4: Design Tokens Audit

### Colors to Replace

| Hardcoded | Replace With |
|-----------|--------------|
| `#F97316` | `primary-main` |
| `#EA580C` | `primary-hover` |
| `#374151` | `text-secondary` |
| `#1F2937` | `text-primary` |
| `#6B7280` | `text-muted` |
| `#9CA3AF` | `text-muted` |
| `#F5F5F5` | `bg-muted` |
| `#EEEEEE` | `bg-hover` |
| `#E5E7EB` | `border-light` |

### Files to Update

1. `PosBasket.tsx` - Lines 106, 115, 126, 141
2. `PosProductGrid.tsx` - Lines 105, 126, 131, 139, 140
3. `PosCategoryTabs.tsx` - Lines 41, 56
4. `PosProductCard.tsx` - Check for any remaining hardcoded colors

---

## Phase 5: Implementation Checklist

### Before Starting
- [ ] Backup current files (optional - git handles this)
- [ ] Review with team

### Phase 1: useOrdersLogic
- [ ] Create `web/modules/orders/utils/order-filters.ts` helper file (~50 lines)
- [ ] Create `useOrdersLogic.ts` hook (~250 lines)
- [ ] Update `OrdersClient.tsx` to use hook (~100 lines)

### Phase 2: Presentational Components
- [ ] Update `PosBasket.tsx` (remove hardcoded colors)
- [ ] Update `PosProductGrid.tsx` (remove hardcoded colors)
- [ ] Update `PosCategoryTabs.tsx` (remove hardcoded colors)
- [ ] Update `PosProductCard.tsx` (check for any issues)

### Phase 3: Layout
- [ ] Add layout constants to `types.ts`
- [ ] Update `OrdersClient.tsx` layout structure
- [ ] Update `PosProductGrid.tsx` grid structure

### Phase 4: Verification
- [ ] Test hydration (no errors in console)
- [ ] Test basket operations
- [ ] Test search and filter
- [ ] Test pagination (load more)
- [ ] Test responsive layout
- [ ] Verify design tokens applied correctly

---

## Migration Notes

### Breaking Changes
None expected - the refactoring is internal only.

### Performance Expectations
- Same or slightly improved performance
- Better code maintainability
- Easier to add new features

### Testing Strategy
1. Manual testing of all POS flows
2. Check console for hydration errors
3. Verify responsive behavior
4. Test with different screen sizes

---

## Timeline Estimate

| Phase | Complexity | Estimated Effort |
|-------|------------|-------------------|
| Phase 1 | High | 2-3 hours |
| Phase 2 | Medium | 1-2 hours |
| Phase 3 | Medium | 1 hour |
| Phase 4 | Low | 30 minutes |
| Verification | Medium | 1 hour |

**Total: ~6-8 hours**

---

## Related Documents

- [POS Terminal Plan](./POS_TERMINAL_PLAN.md)
- [POS Standardization Plan](./POS_STANDARDIZATION_PLAN.md)
- [Frontend Rules](../.kilocode/rules/frontend-rules.md)
- [RMS Design Tokens](../.kilocode/rules/rms-design-tokens-rules.md)
