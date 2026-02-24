# Dashboard Enterprise Refactoring Plan

## Overview
Transform the current dashboard from a "demo panel" feel to a production-grade enterprise ERP used daily by managers.

---

## 1. DashboardClient.tsx - Main Container

### Current Issues:
- Page title (`text-xl font-black`) not authoritative enough
- Subtle status indicator has animation (not enterprise)
- Spacing between sections could be stronger

### Changes Required:
```tsx
// Page Title Section
- Change: text-xl → text-2xl (larger, more authoritative)
- Change: Remove "animate-pulse" from status indicator
- Change: mb-8 → mb-6 (tighter but still spacious)

// Section Separator
- Change: Add stronger visual separation between KPI and content
- Use: border-t with more prominent spacing

// Overall Layout
- Keep: bg-bg-app (correct)
- Adjust: Gap between major sections - stronger separation
```

---

## 2. HeroStats.tsx - KPI Cards

### Current Issues:
- Cards are functional but lack visual weight
- KPI values could be more dominant
- Labels could be smaller/more muted
- Trend indicators could be more subtle and consistently positioned

### Changes Required:
```tsx
// Card Container
- Keep: bg-bg-surface, border-border-light, shadow-sm
- Add: Slightly more prominent shadow or border emphasis

// KPI Labels  
- Change: text-[10px] → text-[9px] (smaller, more refined)
- Change: font-black → font-bold (less aggressive)
- Color: text-text-muted (already correct)

// KPI Values
- Change: text-2xl → text-3xl (more dominant)
- Keep: font-black, tabular-nums
- Add: Slight letter-spacing adjustment for numerical clarity

// Trend Indicators
- Position: Top-right (already correct)
- Change: Make more subtle - smaller text, more muted colors
- Remove: Any decorative elements

// Icon Section
- Keep: Colored icons but refine size and padding
- Ensure: Consistent sizing across all cards
```

---

## 3. RecentOrders.tsx - Orders Table

### Current Issues:
- Table headers lack clear visual separation
- Row hover could be more subtle
- Status badges could be more compact
- Empty areas in table cells

### Changes Required:
```tsx
// Table Header
- Add: bg-bg-muted to <thead> or header <th> cells
- Change: Make headers more distinct with subtle background
- Typography: text-[10px] font-bold (more authoritative)

// Table Rows  
- Change: hover:bg-bg-hover → hover:bg-bg-muted/50 (more subtle)
- Add: Consistent row height

// Status Badges
- Change: More compact - smaller padding
- text-[9px] → text-[8px]
- py-0.5 → py-0.5 (keep but tighten)

// Numeric Values
- Keep: text-right alignment (correct)
- Ensure: tabular-nums for all numbers

// Column Spacing
- Tighten: Reduce unnecessary horizontal padding
- Keep: Overflow handling for mobile
```

---

## 4. UpcomingReservations.tsx - Right Sidebar

### Current Issues:
- List items have too much vertical padding
- Avatar area could be more refined
- Hover effects could be subtler

### Changes Required:
```tsx
// Section Header
- Keep: Good structure with count badge
- Refine: Spacing

// List Items
- Reduce: Vertical padding from p-4 to p-3
- Avatar: Keep 40x40 but refine styling
- Hover: Make more subtle

// Status Badges
- Make: More compact and consistent with orders table

// Action Button
- Refine: Make more professional, less prominent
```

---

## 5. DashboardNavigation.tsx - Management Shortcuts

### CRITICAL ISSUES:
- Hardcoded `text-orange-500` - VIOLATES design tokens
- Hardcoded `bg-orange-500/10` - VIOLATES design tokens

### Changes Required:
```tsx
// FIX: Replace hardcoded orange with semantic tokens
- Change: text-orange-500 → text-primary-main (or text-warning-main)
- Change: bg-orange-500/10 → bg-warning-bg

// Grid Layout
- Keep: 6-column grid on xl screens
- Adjust: Gap for better balance

// Card Styling
- Make: More uniform across all items
- Use: Consistent semantic colors
- Refine: Hover states to be more subtle
```

---

## 6. CriticalStock.tsx (if used on dashboard)

### Current Issues:
- Gauge chart area is quite large
- Could be more integrated

### Changes Required:
```tsx
// Consider: Making this more compact or removing from main view
// If kept: Reduce visual prominence, integrate better
```

---

## Visual Summary of Changes

### Before → After:

| Element | Before | After |
|---------|--------|-------|
| Page Title | text-xl | text-2xl |
| KPI Labels | text-[10px] | text-[9px] |
| KPI Values | text-2xl | text-3xl |
| Table Headers | No background | bg-bg-muted |
| Row Hover | bg-bg-hover | bg-bg-muted/50 |
| Status Badges | text-[9px] | text-[8px], more compact |
| Hardcoded Colors | orange-500 | Semantic tokens |
| Section Spacing | mb-8 | mb-6 (tighter) |

---

## Implementation Priority

1. **P0 (Critical)**: Fix hardcoded colors in DashboardNavigation
2. **P1 (High)**: Improve table headers, KPI values
3. **P2 (Medium)**: Refine spacing, hover states
4. **P3 (Low)**: Polish micro-interactions

---

## Design Tokens to Use

All changes must use these semantic tokens only:
- `bg-bg-app`, `bg-bg-surface`, `bg-bg-muted`, `bg-bg-hover`
- `text-text-primary`, `text-text-secondary`, `text-text-muted`
- `border-border-light`, `border-border-medium`
- `primary-main`, `primary-subtle`
- `success-main`, `success-bg`
- `danger-main`, `danger-bg`
- `warning-main`, `warning-bg`
- `info-main`, `info-bg`
