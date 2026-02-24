# Inventory Module UX Improvements Plan

## Overview
This plan outlines 5 major UX improvements for the Inventory Module to enhance visual hierarchy, quick actions, and form usability.

**Note:** All file paths reference the `web/` folder which is the frontend application base.

---

## 1. StockTable Visual Enhancements

### 1.1 Critical Level Progress Bar
**Files to modify:**
- `web/modules/inventory/components/StockTable.tsx` (lines 58-62)

**Implementation:**
Add a visual progress bar showing stock level relative to critical level:

```tsx
// In the "MEVCUT STOK" column (currentStock)
const percentage = item.critical_level > 0 
    ? Math.min((currentStock / item.critical_level) * 100, 100) 
    : 100;

let barColor = 'bg-success-main';
if (currentStock <= 0) {
    barColor = 'bg-danger-main';
} else if (currentStock <= item.critical_level) {
    barColor = 'bg-warning-main';
}

<td className="px-6 py-4 text-right">
    <div className="flex flex-col items-end gap-1">
        <span className="text-sm font-black tabular-nums tracking-tighter text-text-primary">
            {formatNumericDisplay(currentStock)}
        </span>
        <div className="w-20 h-1 bg-bg-muted rounded-full overflow-hidden">
            <div 
                className={`h-full ${barColor} transition-all duration-300 rounded-full`}
                style={{ width: `${percentage}%` }}
            />
        </div>
    </div>
</td>
```

---

## 2. StockMovementForm - Quick Select Chips

### 2.1 Add Quick Select Chips for Reason Field
**Files to modify:**
- `web/modules/inventory/components/StockMovementForm.tsx` (lines 73-83)

**Implementation:**

```tsx
const REASON_CHIPS = [
    { label: 'Sayım Farkı', value: 'SAYIM FARKI' },
    { label: 'Tedarik', value: 'TEDARIK' },
    { label: 'İade', value: 'İADE' },
    { label: 'Fire', value: 'FIRE' },
    { label: 'Üretim', value: 'URETIM' },
];

// Add chips above the reason textarea
<div className="flex flex-wrap gap-1.5 mb-3">
    {REASON_CHIPS.map((chip) => (
        <button
            key={chip.value}
            type="button"
            onClick={() => setFormData({ ...formData, reason: chip.value })}
            className="px-2 py-1 text-[9px] font-bold uppercase tracking-wider rounded bg-bg-muted/30 text-text-muted hover:bg-primary-subtle hover:text-primary-main transition-colors"
        >
            {chip.label}
        </button>
    ))}
</div>
```

---

## 3. MovementHistory - Color Stripe

### 3.1 Add Color Stripe for IN/OUT Type
**Files to modify:**
- `web/modules/inventory/components/MovementHistory.tsx` (lines 41-71)

**Implementation:**

```tsx
<tr 
    key={m.id} 
    className="group hover:bg-bg-hover transition-colors relative"
>
    {/* Color stripe */}
    <td className="absolute left-0 top-0 bottom-0 w-1">
        <div className={cn(
            "w-full h-full",
            m.type === MovementType.IN ? "bg-success-main" :
            m.type === MovementType.OUT ? "bg-danger-main" : 
            "bg-primary-main"
        )} />
    </td>
    {/* Rest of columns with pl-6 instead of pl-4 */}
    ...
</tr>
```

---

## Implementation Status

- [x] StockTable - Already has quick action buttons and hover effects
- [x] StockTable - Unit badge already present
- [ ] StockTable - Add progress bar (TODO)
- [ ] StockMovementForm - Add Quick Select Chips (TODO)
- [ ] MovementHistory - Add color stripe (TODO)
- [x] MovementHistory - Already uses formatDateTime from date utils
