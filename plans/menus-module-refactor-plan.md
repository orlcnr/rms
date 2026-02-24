# Menus Modülü Refactor Planı

> **Kaynak:** [`.kilocode/rules/frontend-rules.md`](.kilocode/rules/frontend-rules.md)

---

## 📋 Mevcut Durum

### app/(main)/menus/
```
menus/
├── page.tsx                         ✅ (Server component)
└── _components/
    ├── MenusClient.tsx              ✅ (Client component)
    ├── CategoriesSidebar.tsx         ✅
    ├── MenuContent.tsx              ✅
    ├── MenuGridItem.tsx             ✅
    ├── MenusModal.tsx               ✅
    ├── MenuTableColumns.tsx         ✅
    └── MenuToolBar.tsx              ✅
```

### modules/menus/
```
menus/
├── types.ts                         ✅
├── service.ts                       ✅
├── schemas.ts                       ✅
├── components/
│   ├── CategoryForm.tsx             ✅
│   └── MenuItemForm.tsx             ✅
└── ❌ (eksik) index.ts
└── ❌ (eksik) components/index.ts
└── ❌ (eksik) hooks/
```

---

## 🎯 Skill Yapısı ile Karşılaştırma

| Dosya/Klasör | Mevcut | Gerekli |
|--------------|--------|---------|
| `types.ts` | ✅ | ✅ |
| `service.ts` | ✅ | ✅ |
| `schemas.ts` | ✅ | ✅ |
| `components/` | ✅ | ✅ |
| `components/index.ts` | ❌ | ✅ |
| `hooks/` | ❌ | ✅ |
| `hooks/index.ts` | ❌ | ✅ |
| `index.ts` | ❌ | ✅ |

---

## 📦 Frontend Kurallarına Uygun Yapılacak Değişiklikler

### 1. modules/menus/index.ts Oluştur

```typescript
// frontend/modules/menus/index.ts
// @see .kilocode/rules/frontend-rules.md - Section 1: Modüler Yapı

export * from './types';
export * from './service';
export * from './schemas';
export * from './components';
export * from './hooks';
```

### 2. modules/menus/components/index.ts Oluştur

```typescript
// frontend/modules/menus/components/index.ts
// @see .kilocode/rules/frontend-rules.md - Section 4: Bileşen Kuralları

export { CategoryForm } from './CategoryForm';
export { MenuItemForm } from './MenuItemForm';
```

### 3. modules/menus/hooks/ Klasörü ve Hook'lar Oluştur

#### 3.1 Hooks Yapısı

```
hooks/
├── index.ts
├── useMenuData.ts        # Veri fetch mantığı
├── useMenuFilters.ts     # Filtreleme mantığı
└── useMenuModals.ts     # Modal yönetimi
```

#### 3.2 useMenuData.ts

```typescript
// frontend/modules/menus/hooks/useMenuData.ts
// @see .kilocode/rules/frontend-rules.md - Section 9: State Management

import { useState, useCallback, useEffect } from 'react';
import { menusApi } from '../service';
import { Category, MenuItem, PaginatedResponse } from '../types';
import { toast } from 'sonner';

// Options interface
interface UseMenuDataOptions {
  restaurantId: string;
  initialCategories: Category[];
  initialMenuItems: PaginatedResponse<MenuItem>;
}

// Return interface
interface UseMenuDataReturn {
  categories: Category[];
  menuItems: PaginatedResponse<MenuItem>;
  loading: boolean;
  error: Error | null;
  fetchItems: () => Promise<void>;
  createCategory: (data: CreateCategoryInput) => Promise<Category>;
  updateCategory: (id: string, data: Partial<CreateCategoryInput>) => Promise<Category>;
  deleteCategory: (id: string) => Promise<void>;
  createMenuItem: (data: CreateMenuItemInput) => Promise<MenuItem>;
  updateMenuItem: (id: string, data: Partial<CreateMenuItemInput>) => Promise<MenuItem>;
  deleteMenuItem: (id: string) => Promise<void>;
}

export function useMenuData({
  restaurantId,
  initialCategories,
  initialMenuItems,
}: UseMenuDataOptions): UseMenuDataReturn {
  // State'ler en üstte - @see frontend-rules.md Section 4
  const [categories, setCategories] = useState(initialCategories);
  const [menuItems, setMenuItems] = useState(initialMenuItems);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Fetch function - @see frontend-rules.md Section 8: Error Handling
  const fetchItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await menusApi.getMenuItems(restaurantId, {
        page: 1,
        limit: 18,
      });
      setMenuItems(response);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
      toast.error('Menü öğeleri yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  }, [restaurantId]);

  // CRUD Actions - @see frontend-rules.md Section 8
  const createCategory = useCallback(async (data: CreateCategoryInput) => {
    const category = await menusApi.createCategory(data);
    setCategories(prev => [...prev, category]);
    return category;
  }, []);

  const updateCategory = useCallback(async (id: string, data: Partial<CreateCategoryInput>) => {
    const category = await menusApi.updateCategory(id, data);
    setCategories(prev => prev.map(c => c.id === id ? category : c));
    return category;
  }, []);

  const deleteCategory = useCallback(async (id: string) => {
    await menusApi.deleteCategory(id);
    setCategories(prev => prev.filter(c => c.id !== id));
  }, []);

  const createMenuItem = useCallback(async (data: CreateMenuItemInput) => {
    const item = await menusApi.createMenuItem(data);
    await fetchItems();
    return item;
  }, [fetchItems]);

  const updateMenuItem = useCallback(async (id: string, data: Partial<CreateMenuItemInput>) => {
    const item = await menusApi.updateMenuItem(id, data);
    await fetchItems();
    return item;
  }, [fetchItems]);

  const deleteMenuItem = useCallback(async (id: string) => {
    await menusApi.deleteMenuItem(id);
    await fetchItems();
  }, [fetchItems]);

  return {
    categories,
    menuItems,
    loading,
    error,
    fetchItems,
    createCategory,
    updateCategory,
    deleteCategory,
    createMenuItem,
    updateMenuItem,
    deleteMenuItem,
  };
}
```

#### 3.3 useMenuFilters.ts

```typescript
// frontend/modules/menus/hooks/useMenuFilters.ts
// @see .kilocode/rules/frontend-rules.md - Section 9: State Management

import { useState, useCallback } from 'react';

export type ViewMode = 'grid' | 'table';

interface UseMenuFiltersReturn {
  selectedCategoryId: string | 'all';
  searchQuery: string;
  currentPage: number;
  viewMode: ViewMode;
  setSelectedCategoryId: (id: string | 'all') => void;
  setSearchQuery: (query: string) => void;
  setCurrentPage: (page: number) => void;
  setViewMode: (mode: ViewMode) => void;
}

export function useMenuFilters(): UseMenuFiltersReturn {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  // Memoized callbacks
  const handleCategoryChange = useCallback((id: string | 'all') => {
    setSelectedCategoryId(id);
    setCurrentPage(1);
  }, []);

  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);
  }, []);

  return {
    selectedCategoryId,
    searchQuery,
    currentPage,
    viewMode,
    setSelectedCategoryId: handleCategoryChange,
    setSearchQuery: handleSearchChange,
    setCurrentPage,
    setViewMode,
  };
}
```

#### 3.4 useMenuModals.ts

```typescript
// frontend/modules/menus/hooks/useMenuModals.ts
// @see .kilocode/rules/frontend-rules.md - Section 9: State Management

import { useState, useCallback } from 'react';
import { MenuItem, Category } from '../types';

type ModalType = 'category' | 'item' | null;

interface UseMenuModalsReturn {
  modalType: ModalType;
  editingData: MenuItem | Category | null;
  isOpen: boolean;
  openItemModal: (item?: MenuItem) => void;
  openCategoryModal: (category?: Category) => void;
  closeModal: () => void;
}

export function useMenuModals(): UseMenuModalsReturn {
  const [modalType, setModalType] = useState<ModalType>(null);
  const [editingData, setEditingData] = useState<MenuItem | Category | null>(null);

  const openItemModal = useCallback((item?: MenuItem) => {
    setEditingData(item || null);
    setModalType('item');
  }, []);

  const openCategoryModal = useCallback((category?: Category) => {
    setEditingData(category || null);
    setModalType('category');
  }, []);

  const closeModal = useCallback(() => {
    setModalType(null);
    setEditingData(null);
  }, []);

  return {
    modalType,
    editingData,
    isOpen: modalType !== null,
    openItemModal,
    openCategoryModal,
    closeModal,
  };
}
```

#### 3.5 hooks/index.ts

```typescript
// frontend/modules/menus/hooks/index.ts
// @see .kilocode/rules/frontend-rules.md - Section 1: Modüler Yapı

export { useMenuData } from './useMenuData';
export { useMenuFilters } from './useMenuFilters';
export { useMenuModals } from './useMenuModals';
```

### 4. MenusClient.tsx'i Güncelle

```typescript
// frontend/app/(main)/menus/_components/MenusClient.tsx
// @see .kilocode/rules/frontend-rules.md - Section 4: Bileşen Kuralları

'use client';

import { useEffect, useRef } from 'react';
import { Category, MenuItem, PaginatedResponse } from '@/modules/menus/types';
import { PageHeader } from '@/modules/shared/components/PageHeader';
import { Package } from 'lucide-react';
import { toast } from 'sonner';

// Import hooks - @see frontend-rules.md Section 9
import { useMenuData, useMenuFilters, useMenuModals } from '@/modules/menus/hooks';

// Import components
import MenuToolbar from './MenuToolBar';
import CategoriesSidebar from './CategoriesSidebar';
import MenusModals from './MenusModal';
import MenuContent from './MenuContent';

// Props interface - @see frontend-rules.md Section 4
interface MenusClientProps {
  restaurantId: string;
  initialCategories: Category[];
  initialMenuItems: PaginatedResponse<MenuItem>;
}

// Component - @see frontend-rules.md Section 4: Bileşen Sırası
export default function MenusClient({
  restaurantId,
  initialCategories,
  initialMenuItems,
}: MenusClientProps) {
  // Hook'lar
  const {
    categories,
    menuItems,
    loading,
    fetchItems,
    deleteMenuItem,
  } = useMenuData({
    restaurantId,
    initialCategories,
    initialMenuItems,
  });

  const {
    selectedCategoryId,
    searchQuery,
    currentPage,
    viewMode,
    setSelectedCategoryId,
    setSearchQuery,
    setCurrentPage,
    setViewMode,
  } = useMenuFilters();

  const {
    modalType,
    editingData,
    isOpen,
    openItemModal,
    openCategoryModal,
    closeModal,
  } = useMenuModals();

  // Memo/Callback
  const isFirstRender = useRef(true);

  // Effect - @see frontend-rules.md Section 4
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    fetchItems();
  }, [currentPage, searchQuery, selectedCategoryId]);

  // Handler methods
  const handleDeleteItem = async (item: MenuItem) => {
    if (confirm('Bu ürünü silmek istediğinize emin misiniz?')) {
      try {
        await deleteMenuItem(item.id);
        toast.success('Ürün başarıyla silindi.');
      } catch {
        toast.error('Ürün silinirken bir hata oluştu.');
      }
    }
  };

  // Early return - @see frontend-rules.md Section 4
  // (gerekirse)

  // Ana render
  return (
    <div className="p-6 space-y-8 max-w-[1700px] mx-auto animate-in fade-in duration-700">
      <PageHeader
        title="ÜRÜN & MENÜ"
        subtitle="Restoran menüsünü buradan yönetebilirsiniz."
        icon={Package}
      />

      <MenuToolbar
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onNewCategory={openCategoryModal}
        onNewItem={() => openItemModal()}
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <CategoriesSidebar
          categories={categories}
          selectedId={selectedCategoryId}
          onSelect={setSelectedCategoryId}
        />

        <div className="lg:col-span-3">
          <MenuContent
            categories={categories}
            menuItems={menuItems}
            viewMode={viewMode}
            isLoading={loading}
            onEdit={openItemModal}
            onDelete={handleDeleteItem}
            onPageChange={setCurrentPage}
          />
        </div>
      </div>

      <MenusModals
        isOpen={isOpen}
        type={modalType}
        editingData={editingData}
        categories={categories}
        restaurantId={restaurantId}
        onClose={closeModal}
        onCategoriesUpdated={(cats) => {
          // Refresh categories
          closeModal();
        }}
        onItemsUpdated={() => {
          fetchItems();
          closeModal();
        }}
      />
    </div>
  );
}
```

---

## ✅ Özet

| Adım | Dosya | Kural Referansı |
|------|-------|-----------------|
| 1 | `modules/menus/index.ts` | Section 1: Modüler Yapı |
| 2 | `modules/menus/components/index.ts` | Section 4: Bileşen Kuralları |
| 3 | `modules/menus/hooks/useMenuData.ts` | Section 8, 9 |
| 4 | `modules/menus/hooks/useMenuFilters.ts` | Section 9 |
| 5 | `modules/menus/hooks/useMenuModals.ts` | Section 9 |
| 6 | `modules/menus/hooks/index.ts` | Section 1 |
| 7 | `app/(main)/menus/_components/MenusClient.tsx` | Section 4, 9 |

---

## 🎯 Uygulanan Kurallar

1. **Modüler Yapı** - hooks/ klasörü eklendi
2. **TypeScript** - Tüm interface'ler tanımlandı
3. **Bileşen Sırası** - State → Hooks → Memo → Effect → Render
4. **Error Handling** - Try-catch, loading states, toast
5. **State Management** - Hooks ile mantık ayrıştırma
6. **Naming Convention** - useMenuData, useMenuFilters, useMenuModals

---

## ❓ Sorular

1. **Hook'ları ayrı dosyalar olarak mı istersin?** (yukarıdaki gibi)
2. **Ekstra özellik eklemek ister misin?**
3. **Component katmanlaması değişsin mi?**
