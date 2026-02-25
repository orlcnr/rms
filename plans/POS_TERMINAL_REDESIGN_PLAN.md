# POS Terminal Redesign Plan (Güncellenmiş)

## Overview

This document outlines the redesign plan for the POS Terminal (Point of Sale) screen based on user feedback about layout alignment, spacing consistency, and visual improvements.

**Status**: Planning (Updated)  
**Target**: POS Terminal Screen (`web/app/(main)/orders/pos/[tableId]/page.tsx`)  
**Last Updated**: 2026-02-25

---

## Visual Reference Schema (Kullanıcıdan Gelen)

```
[KENAR ÇİZGİSİ (px-6)]                                          [KENAR ÇİZGİSİ (px-6)]
|                                                                                   |
|  [1] SUBHEADER AREA (PosSubHeader)                                                |
|  POS TERMİNALİ ---------------------------------------------- [ Masa: 5 | Salon ] |
|  _______________________________________________________________________________  |
|                                                                                   |
|  [2] SEARCH & CATEGORY PANEL (Full Width Block)                                   |
|  +-----------------------------------------------------------------------------+  |
|  | [🔍 Ürün ara...] (Search Bar - px-6)                                         |  |
|  | --------------------------------------------------------------------------- |  |
|  | [TÜMÜ] [MEZELER] [ARA SICAKLAR] [ANA YEMEKLER] [İÇECEKLER] (Tabs - px-6)    |  |
|  +-----------------------------------------------------------------------------+  |
|                                                                                   |
|  (mt-6 Boşluk)                                                                    |
|                                                                                   |
|  [3] PRODUCT GRID AREA                      |  [4] BASKET PANEL (Adisyon)         |
|  |                                          |  |                               |  |
|  | +----------+  +----------+  +----------+ |  | +---------------------------+ |  |
|  | | ÜRÜN 1   |  | ÜRÜN 2   |  | ÜRÜN 3   | |  | | ADİSYON                   | |  |
|  | | ₺250     |  | ₺180     |  | ₺320     | |  | | ------------------------- | |  |
|  | +----------+  +----------+  +----------+ |  | | Ürün A (x2) ........ ₺100 | |  |
|  |                                          |  | | Ürün B (x1) ......... ₺50 | |  |
|  | +----------+  +----------+  +----------+ |  | | ------------------------- | |  |
|  | | ÜRÜN 4   |  | ÜRÜN 5   |  | ÜRÜN 6   | |  | | ARA TOPLAM .......... ₺150 | |  |
|  | | ₺400     |  | ₺120     |  | ₺90      | |  | | GENEL TOPLAM ........ ₺150 | |  |
|  | +----------+  +----------+  +----------+ |  | | ------------------------- | |  |
|  |                                          |  | | [ SİPARİŞİ GÜNCELLE ]     | |  |
|  |                                          |  | +---------------------------+ |  |
|                                                                                   |
[SOL HİZA]                                                                [SAĞ HİZA]
```

---

## Key Principles

1. **Hayali Duvar (Container Constraint)**: Tüm ana parçalara aynı `px-6` (24px) değeri uygula
2. **Eşit Hizalama**: Search bar ve category tabs aynı dikey çizgide bitmeli
3. **Grid & Basket Senkronu**: Her ikisi de aynı parent div içinde, gap-6 ile ayrılmış
4. **Fiyat Hizalama**: Adisyondaki tüm fiyatlar sağa yaslı (`text-right`) ve `min-w-[80px]`

---

## Proposed Solution

### 1. Main Layout Structure (OrdersClient.tsx)

**Current**:
```jsx
<div className="h-[calc(100vh-theme(spacing.16)-100px)] flex flex-col bg-bg-app overflow-hidden">
  {/* Header */}
  <PosSubHeader />

  {/* Main Content */}
  <div className="flex-1 flex overflow-hidden">
    {/* LEFT PANEL */}
    <div className="flex-1 flex flex-col overflow-hidden p-6">
      {/* Search Panel */}
      <div className="bg-bg-surface border border-border-light rounded-sm p-6 shadow-sm mb-6">
        {/* Search */}
        <div className="relative group mb-6">...</div>
        {/* Categories */}
        <PosCategoryTabs />
      </div>

      {/* Product Grid */}
      <div className="flex-1 overflow-y-auto">
        <PosProductGrid />
      </div>
    </div>

    {/* RIGHT PANEL */}
    <div className="hidden lg:flex lg:w-[360px] flex-col bg-bg-surface border-l border-border-light shadow-xl mt-5">
      <PosBasket />
    </div>
  </div>
</div>
```

**Proposed**:
```jsx
<div className="h-[calc(100vh-theme(spacing.16)-100px)] flex flex-col bg-bg-app overflow-hidden">
  {/* [1] SUBHEADER AREA - px-6 padding */}
  <PosSubHeader />

  {/* Main Content - flex with gap-6 */}
  <div className="flex-1 flex overflow-hidden">
    {/* LEFT PANEL - flex-1 */}
    <div className="flex-1 flex flex-col overflow-hidden">
      
      {/* [2] SEARCH & CATEGORY PANEL - Full Width Block */}
      <div className="bg-bg-surface border-y border-border-light">
        {/* Search Input - px-6 pt-6 pb-4 */}
        <div className="px-6 pt-6 pb-4">
          <div className="relative group">
            <Search className="..." />
            <input className="w-full ..." />
          </div>
        </div>
        
        {/* Category Tabs - px-6 pb-4 */}
        <div className="px-6 pb-4">
          <PosCategoryTabs />
        </div>
      </div>

      {/* [3] PRODUCT GRID AREA - mt-6 */}
      <div className="flex-1 overflow-y-auto px-6 mt-6">
        <PosProductGrid />
      </div>
    </div>

    {/* RIGHT PANEL - Basket - mt-6, mr-6, mb-6 */}
    <div className="hidden lg:flex lg:w-[360px] flex-col bg-bg-surface border-l border-border-light shadow-sm mt-6 mr-6 mb-6 rounded-sm">
      <PosBasket />
    </div>
  </div>
</div>
```

### 2. PosSubHeader - px-6 Padding

**Current**:
```jsx
<div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-border-light pb-4">
```

**Proposed**:
```jsx
<div className="flex items-end justify-between px-6 pb-4 border-b border-border-light">
  {/* Left: Title */}
  <div className="flex items-center gap-2">
    <div className="w-2 h-6 bg-primary-main rounded-full" />
    <h1 className="text-2xl font-black text-text-primary uppercase tracking-tight">
      POS TERMİNALİ
    </h1>
  </div>
  
  {/* Right: Table Info (optional) */}
  {selectedTable && (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium text-text-secondary">
        Masa: {selectedTable.name}
      </span>
    </div>
  )}
</div>
```

### 3. Search & Category Panel - Full Width Block

**Current**:
```jsx
<div className="bg-bg-surface border border-border-light rounded-sm p-6 shadow-sm mb-6">
  <div className="relative group mb-6">
    <input className="w-full ..." />
  </div>
  <PosCategoryTabs />
</div>
```

**Proposed**:
```jsx
{/* Full-bleed panel - border-top and border-bottom */}
<div className="bg-bg-surface border-y border-border-light">
  {/* Search Input Section */}
  <div className="px-6 pt-6 pb-4">
    <div className="relative group">
      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
      <input
        type="text"
        placeholder="ÜRÜN ADI VEYA İÇERİK İLE ARA..."
        className="w-full bg-bg-app border border-border-light rounded-sm py-3 pl-12 pr-4 text-xs font-black uppercase outline-none focus:border-primary-main"
      />
    </div>
  </div>

  {/* Divider */}
  <div className="border-t border-border-light mx-6" />

  {/* Category Tabs Section */}
  <div className="px-6 pb-4 pt-4">
    <PosCategoryTabs />
  </div>
</div>
```

### 4. Product Grid & Basket - Same Level Start

**Current**:
```jsx
<div className="flex-1 flex overflow-hidden">
  <div className="flex-1 flex flex-col overflow-hidden p-6">
    {/* Product Grid */}
  </div>
  <div className="... mt-5"> {/* WRONG! */}
    {/* Basket */}
  </div>
</div>
```

**Proposed**:
```jsx
<div className="flex-1 flex overflow-hidden">
  {/* Product Grid Container - mt-6 from search panel */}
  <div className="flex-1 flex flex-col overflow-hidden">
    <div className="flex-1 overflow-y-auto px-6 mt-6">
      <PosProductGrid />
    </div>
  </div>

  {/* Basket Container - SAME LEVEL as product grid, gap-6 */}
  <div className="hidden lg:flex lg:w-[360px] flex-col bg-bg-surface border-l border-border-light shadow-sm mt-6 mr-6 mb-6 rounded-sm">
    <PosBasket />
  </div>
</div>
```

**Key**: Wrap both panels in a flex container and apply gap-6, but since we need different margins, use individual mt-6 on each panel.

### 5. PosBasket - Price Alignment

**Current**:
```jsx
<div className="flex items-center justify-between py-2 border-b border-dotted border-border-light gap-2">
  <h4 className="text-xs font-bold text-text-primary uppercase truncate flex-1 mr-2">
    {item.name}
  </h4>
  <div className="flex items-center gap-2">
    <span className="text-[10px] font-bold text-text-muted whitespace-nowrap min-w-[50px] text-right">
      {formatCurrency(item.price * item.quantity)}
    </span>
  </div>
</div>
```

**Proposed**:
```jsx
<div className="flex items-center justify-between py-2.5 border-b border-border-light/60 gap-3">
  {/* Product Name - left */}
  <div className="flex-1 min-w-0">
    <h4 className="text-xs font-semibold text-text-primary truncate">
      {item.name}
    </h4>
  </div>

  {/* Quantity Controls */}
  <div className="flex items-center gap-1.5 shrink-0">
    <button className="w-6 h-6 flex items-center justify-center rounded bg-bg-muted hover:bg-primary-main hover:text-white transition-colors">
      <Minus size={10} />
    </button>
    <span className="w-5 text-center text-xs font-bold">{item.quantity}</span>
    <button className="w-6 h-6 flex items-center justify-center rounded bg-bg-muted hover:bg-primary-main hover:text-white transition-colors">
      <Plus size={10} />
    </button>
  </div>

  {/* Price - RIGHT ALIGNED with min-w-[80px] */}
  <span className="text-xs font-bold text-text-primary whitespace-nowrap min-w-[80px] text-right">
    {formatCurrency(item.price * item.quantity)}
  </span>

  {/* Delete Button */}
  <button className="p-1 hover:bg-bg-muted rounded transition-colors shrink-0">
    <Trash2 size={12} className="text-text-muted" />
  </button>
</div>
```

### 6. PosBasket - Total Section

**Current**:
```jsx
<div className="pt-4 border-t-2 border-border-light">
  <div className="flex flex-col gap-1 mb-3">
    <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">
      Toplam
    </span>
    <span className="text-2xl font-bold text-primary-main">
      {formatCurrency(summary.total)}
    </span>
  </div>
</div>
```

**Proposed**:
```jsx
<div className="pt-4 border-t-2 border-border-light">
  {/* Subtotal Row */}
  <div className="flex justify-between items-center mb-2">
    <span className="text-xs font-medium text-text-muted">Ara Toplam</span>
    <span className="text-sm font-semibold text-text-primary">
      {formatCurrency(summary.subtotal || summary.total)}
    </span>
  </div>

  {/* Discount Row (if applicable) */}
  {summary.discount > 0 && (
    <div className="flex justify-between items-center mb-2">
      <span className="text-xs font-medium text-success-main">İndirim</span>
      <span className="text-sm font-semibold text-success-main">
        -{formatCurrency(summary.discount)}
      </span>
    </div>
  )}

  {/* Total Row - PROMINENT */}
  <div className="flex justify-between items-center pt-2 border-t border-border-light">
    <span className="text-xs font-bold text-text-primary uppercase tracking-wider">
      GENEL TOPLAM
    </span>
    <span className="text-2xl font-black text-primary-main tabular-nums">
      {formatCurrency(summary.total)}
    </span>
  </div>

  {/* Item Count */}
  <div className="flex justify-between items-center mt-2">
    <span className="text-xs text-text-muted">{summary.itemCount} ürün</span>
  </div>
</div>
```

---

## Implementation Plan

### Phase 1: Layout Container Fix (OrdersClient.tsx)

| Step | Task | CSS Changes |
|------|------|-------------|
| 1.1 | Update outer container | Add `px-6` to main container |
| 1.2 | Restructure search panel | Use `border-y`, separate sections with `px-6` |
| 1.3 | Fix product grid container | Add `px-6 mt-6` |
| 1.4 | Fix basket container | Add `mt-6 mr-6 mb-6`, change `shadow-xl` to `shadow-sm` |

### Phase 2: PosSubHeader Alignment

| Step | Task | CSS Changes |
|------|------|-------------|
| 2.1 | Update header container | Change to `px-6 pb-4` |
| 2.2 | Simplify flex layout | Remove unnecessary wrapper divs |

### Phase 3: PosBasket Price Alignment

| Step | Task | CSS Changes |
|------|------|-------------|
| 3.1 | Update product rows | Add `min-w-[80px] text-right` to prices |
| 3.2 | Update total section | Add "Ara Toplam" + "GENEL TOPLAM" separation |
| 3.3 | Update header | Reduce font size and padding |

---

## Files to Modify

### Primary Files
1. `web/modules/orders/components/OrdersClient.tsx` - Main layout
2. `web/modules/orders/components/PosSubHeader.tsx` - Header alignment
3. `web/modules/orders/components/PosBasket.tsx` - Price alignment & totals

---

## Acceptance Criteria

1. **Container Alignment**: All main sections (SubHeader, Search Panel, Product Grid, Basket) use consistent `px-6` (24px) padding on left/right edges
2. **Search & Category Sync**: Search input and category tabs both end at the same vertical line (px-6 boundary)
3. **Grid & Basket Same Start**: Both panels start at the same vertical level with `mt-6` from search panel
4. **Price Alignment**: All prices in basket use `text-right` and `min-w-[80px]` for aligned decimals
5. **Total Hierarchy**: Clear "ARA TOPLAM" and "GENEL TOPLAM" separation with prominent styling

---

## Visual Checkpoints

- [ ] SubHeader: Left and right edges align with product grid
- [ ] Search Panel: Full-width, border-y only, no rounded corners
- [ ] Category Tabs: Ends at same line as search input
- [ ] Product Grid: Starts at same vertical level as basket
- [ ] Basket Prices: All decimal points align vertically
- [ ] Basket Total: Clear hierarchy between subtotal and total
