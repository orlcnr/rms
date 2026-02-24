# Tables Module Refactoring Plan

## Overview

This document outlines the refactoring plan to align the Tables module components with the project's shared component architecture and design language (Enterprise ERP Design Tokens).

## Current Issues Identified

### 1. TablesClient.tsx (Lines 1-340)
| Issue | Current | Expected |
|-------|---------|----------|
| Header design | Glassy dark UI with gradients (`bg-white/5`, `rounded-[2.5rem]`, blur effects) | Enterprise design (`bg-bg-surface`, `border-border-light`, `rounded-sm`) |
| Buttons | Native `<button>` with custom classes | `Button` component from shared components |
| Stats cards | Custom glassy styling (`white/5`, `emerald-400`, `red-400`) | Design tokens (`bg-bg-surface`, `text-success-main`, `text-danger-main`) |
| QR Modal buttons | Native `<button>` with custom classes | `Button` component |

### 2. TableForm.tsx (Lines 1-117)
| Issue | Current | Expected |
|-------|---------|----------|
| Input fields | Native `<input>` with custom classes | `FormInput` component |
| Select field | Native `<select>` with custom classes | `FormInput` with `isSelect` prop |
| Buttons | Native `<button>` with custom classes | `Button` component |
| Layout | No section wrapper | Wrap with `FormSection` |
| Form styling | Custom `bg-bg-muted`, `rounded-2xl` | Standard enterprise: `bg-bg-app`, `rounded-sm` |

### 3. AreaForm.tsx (Lines 1-68)
| Issue | Current | Expected |
|-------|---------|----------|
| Input field | Native `<input>` with custom classes | `FormInput` component |
| Buttons | Native `<button>` with custom classes | `Button` component |
| Layout | No section wrapper | Wrap with `FormSection` |
| Form styling | Custom `bg-bg-muted`, `rounded-2xl` | Standard enterprise: `bg-bg-app`, `rounded-sm` |

### 4. TableCard.tsx (Lines 1-102)
| Issue | Current | Expected |
|-------|---------|----------|
| Card design | Glassy dark UI (`bg-white/5`, `rounded-[2.5rem]`, white text) | Enterprise design (`bg-bg-surface`, `border-border-light`, `text-text-primary`) |
| Status badges | Custom colors (`emerald-400`, `red-400`, `blue-400`) | Use existing `TABLE_STATUS_STYLES` from enums |
| Typography | White text, large fonts | Design tokens (`text-text-primary`, standard sizes) |
| Hover effects | Complex glassy transitions | Standard enterprise hover states |

### 5. TableActions.tsx (Lines 1-37)
| Issue | Current | Expected |
|-------|---------|----------|
| Buttons | Native `<button>` with custom classes | `Button` component with `variant="ghost"` |

---

## Reference Implementation

The refactored components should follow the pattern from `ProductForm.tsx`, `ProductGeneralInfo.tsx`, and `ProductPricing.tsx`:

```tsx
// ProductGeneralInfo.tsx pattern
import { FormInput } from '@/modules/shared/components/FormInput';
import { FormSection } from '@/modules/shared/components/FormSection';

export function ProductGeneralInfo(...) {
  return (
    <FormSection title="SECTION TITLE" variant="primary">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        <FormInput
          id="fieldId"
          name="fieldName"
          label="Field Label"
          value={formData.fieldName}
          onChange={(value) => setFormData({ ...formData, fieldName: value })}
          required
        />
      </div>
    </FormSection>
  );
}
```

```tsx
// ProductPricing.tsx pattern for buttons
import { Button } from '@/modules/shared/components/Button';

<Button variant="primary" onClick={handleSubmit}>
  KAYDET
</Button>

<Button variant="outline" onClick={handleCancel}>
  İPTAL
</Button>
```

---

## Detailed Refactoring Steps

### Step 1: Refactor AreaForm.tsx
**File:** `web/modules/tables/components/AreaForm.tsx`

**Changes:**
1. Import `FormInput`, `FormSection`, `Button` from shared components
2. Replace native `<input>` with `FormInput` component
3. Wrap form content with `FormSection`
4. Replace native `<button>` with `Button` component
5. Apply standard enterprise styling (remove `rounded-2xl`, use `rounded-sm`)

**Before:**
```tsx
<input
  type="text"
  required
  className="w-full bg-bg-muted border border-border-light rounded-2xl py-4 px-5..."
/>
```

**After:**
```tsx
<FormSection title="SALON BİLGİLERİ" variant="primary">
  <FormInput
    id="areaName"
    name="name"
    label="Salon / Alan Adı"
    value={formData.name}
    onChange={(value) => setFormData({ ...formData, name: value })}
    placeholder="Örn: Teras, Bahçe, Salon 1..."
    required
  />
</FormSection>
```

### Step 2: Refactor TableForm.tsx
**File:** `web/modules/tables/components/TableForm.tsx`

**Changes:**
1. Import `FormInput`, `FormSection`, `Button` from shared components
2. Replace native `<input>` (name field) with `FormInput`
3. Replace native `<input>` (capacity field) with `FormInput` (use `type="number"`)
4. Replace native `<select>` with `FormInput` using `isSelect` prop
5. Wrap form sections with `FormSection`
6. Replace native `<button>` with `Button` component
7. Update `CAPACITY_OPTIONS` to match FormInput's option format if needed

**Before:**
```tsx
<select
  required
  className="w-full bg-bg-muted border border-border-light rounded-2xl..."
>
  <option value="" disabled>Salon Seçin</option>
  {areas.map((area) => (
    <option key={area.id} value={area.id}>{area.name}</option>
  ))}
</select>
```

**After:**
```tsx
<FormInput
  id="tableArea"
  name="area_id"
  label="Salon / Alan"
  value={formData.area_id}
  onChange={(value) => setFormData({ ...formData, area_id: value })}
  options={areas.map(area => ({ value: area.id, label: area.name }))}
  isSelect
  required
  placeholder="Salon Seçin"
/>
```

### Step 3: Refactor TablesClient.tsx
**File:** `web/modules/tables/components/TablesClient.tsx`

**Changes:**
1. Import `Button` from shared components
2. Replace header section with enterprise design:
   - Remove glassy/dark effects
   - Use `bg-bg-surface`, `border-border-light`, `text-text-primary`
3. Replace action buttons with `Button` component
4. Update stats cards to use enterprise design tokens
5. Replace QR modal buttons with `Button` component

**Before:**
```tsx
<div className="lg:col-span-8 flex ... bg-white/5 border border-white/10 rounded-[2.5rem] ...">
  <button className="px-8 py-4 bg-orange-500 ...">Yeni Masa</button>
</div>
```

**After:**
```tsx
<div className="lg:col-span-8 flex ... bg-bg-surface border border-border-light rounded-sm p-6">
  <Button variant="primary" onClick={handleAddTable}>
    <Plus className="w-4 h-4 mr-2" />
    Yeni Masa
  </Button>
</div>
```

### Step 4: Refactor TableCard.tsx
**File:** `web/modules/tables/components/TableCard.tsx`

**Changes:**
1. Replace glassy dark UI with enterprise design
2. Use `TABLE_STATUS_STYLES` from enums for status badges
3. Update typography to use design tokens
4. Update hover states to enterprise patterns

**Before:**
```tsx
<div className="... bg-white/5 border ... rounded-[2.5rem] ...">
  <div className="... text-white ...">{table.name}</div>
</div>
```

**After:**
```tsx
<div className="... bg-bg-surface border border-border-light ... rounded-sm hover:border-primary-main transition-colors">
  <div className="... text-text-primary ...">{table.name}</div>
</div>
```

### Step 5: Refactor TableActions.tsx
**File:** `web/modules/tables/components/TableActions.tsx`

**Changes:**
1. Import `Button` from shared components
2. Replace native `<button>` with `Button` component using `variant="ghost"`

**Before:**
```tsx
<button className="p-2 hover:bg-bg-muted rounded text-text-muted...">
  <QrCode size={16} />
</button>
```

**After:**
```tsx
<Button variant="ghost" size="sm" onClick={onShowQr}>
  <QrCode size={16} />
</Button>
```

---

## Design Token Migration Summary

| Old Style | New Style |
|-----------|-----------|
| `bg-white/5` | `bg-bg-surface` |
| `bg-white/10` | `bg-bg-muted` |
| `text-white` | `text-text-primary` |
| `text-white/40` | `text-text-muted` |
| `rounded-[2.5rem]` | `rounded-sm` |
| `rounded-2xl` | `rounded-sm` |
| `emerald-400` | `text-success-main` |
| `red-400` | `text-danger-main` |
| `blue-400` | `text-info-main` |
| `orange-500` | `primary-main` |

---

## Component Dependencies

After refactoring, the following imports will be needed in Tables module:

```tsx
// AreaForm.tsx
import { FormInput } from '@/modules/shared/components/FormInput';
import { FormSection } from '@/modules/shared/components/FormSection';
import { Button } from '@/modules/shared/components/Button';

// TableForm.tsx
import { FormInput } from '@/modules/shared/components/FormInput';
import { FormSection } from '@/modules/shared/components/FormSection';
import { Button } from '@/modules/shared/components/Button';
import { CAPACITY_OPTIONS } from '../types';

// TablesClient.tsx
import { Button } from '@/modules/shared/components/Button';
import { Modal } from '@/modules/shared/components/Modal';

// TableCard.tsx
import { TABLE_STATUS_STYLES } from '../enums/table-status.enum';

// TableActions.tsx
import { Button } from '@/modules/shared/components/Button';
```

---

## Implementation Order

1. **AreaForm.tsx** - Simplest form, least dependencies
2. **TableForm.tsx** - More complex form with select
3. **TableActions.tsx** - Simple button replacements
4. **TableCard.tsx** - Visual component, careful with styling
5. **TablesClient.tsx** - Main container, most changes

---

## Validation Checklist

After each component is refactored, verify:

- [ ] All inputs use `FormInput` component
- [ ] All buttons use `Button` component  
- [ ] Form sections use `FormSection` wrapper
- [ ] No glassy/dark effects remain
- [ ] All colors use design tokens
- [ ] Border radius is `rounded-sm`
- [ ] Typography uses design tokens
- [ ] Modal still functions correctly
- [ ] Form submission still works
- [ ] Responsive layout preserved
