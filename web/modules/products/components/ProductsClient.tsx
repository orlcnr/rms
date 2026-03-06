'use client'

import React, { useEffect, useState } from 'react'
import { Plus, Search, Filter, Loader2, X } from 'lucide-react'
import { format } from 'date-fns'
import { tr } from 'date-fns/locale'
import { toast } from 'sonner'
import { Modal } from '@/modules/shared/components/Modal'
import { Button } from '@/modules/shared/components/Button'
import { SubHeaderSection, FilterSection, BodySection } from '@/modules/shared/components/layout'
import { useSocketStore } from '@/modules/shared/api/socket'
import { getNow } from '@/modules/shared/utils/date'
import { cn } from '@/modules/shared/utils/cn'
import { inventoryApi } from '../../inventory/services/inventory.service'
import { Ingredient } from '../../inventory/types'
import { productsApi } from '../services/products.service'
import { Category, CreateMenuItemInput, MenuItem, PaginatedResponse } from '../types'
import { useProductFilters } from '../hooks/useProductFilters'
import { useProductsData } from '../hooks/useProductsData'
import { useProductsSync } from '../hooks/useProductsSync'
import { CategoryTabs } from './CategoryTabs'
import { ProductCard } from './ProductCard'
import { ProductForm } from './ProductForm'
import { FilterDropdown } from './FilterDropdown'
import { ActiveFiltersBar } from './ActiveFiltersBar'
import { ViewToggle } from './ViewToggle'
import { ProductsStatsSummary } from './ProductsStatsSummary'
import { EmptyProductsState } from './EmptyProductsState'
import { ProductsLoadingOverlay } from './ProductsLoadingOverlay'
import { CategoryFormModal } from './CategoryFormModal'

interface ProductsClientProps {
    restaurantId: string
    initialCategories: Category[]
    initialProductsResponse: PaginatedResponse<MenuItem>
}

export function ProductsClient({
    restaurantId,
    initialCategories,
    initialProductsResponse,
}: ProductsClientProps) {
    const { isConnected: socketConnected } = useSocketStore()
    const [mounted, setMounted] = useState(false)
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
    const [categories, setCategories] = useState<Category[]>(initialCategories)

    const {
        activeCategoryId,
        setActiveCategoryId,
        searchQuery,
        setSearchQuery,
        debouncedSearch,
        showFilters,
        setShowFilters,
        filters,
        setFilters,
        activeFilterCount,
        clearFilters,
    } = useProductFilters()

    const {
        products,
        hasMore,
        totalProductsCount,
        isRefreshing,
        isLoadingMore,
        scrollContainerRef,
        observerTarget,
        refreshProducts,
        scheduleAutoFill,
        applyProductsResponse,
    } = useProductsData({
        restaurantId,
        mounted,
        initialProductsResponse,
        debouncedSearch,
        activeCategoryId,
        filters,
    })

    useProductsSync({
        mounted,
        initialCategories,
        initialProductsResponse,
        setCategories,
        applyProductsResponse,
        refreshProducts,
        debouncedSearch,
        activeCategoryId,
        filters,
    })

    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingProduct, setEditingProduct] = useState<MenuItem | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false)
    const [categoryName, setCategoryName] = useState('')
    const [categoryDescription, setCategoryDescription] = useState('')
    const [allIngredients, setAllIngredients] = useState<Ingredient[]>([])

    useEffect(() => {
        setMounted(true)
    }, [])

    useEffect(() => {
        const fetchIngredients = async () => {
            try {
                const response = await inventoryApi.getIngredients({ limit: 100 })
                setAllIngredients(response.items)
            } catch (error) {
                console.error('Failed to fetch ingredients for recipes:', error)
            }
        }

        void fetchIngredients()
    }, [])

    useEffect(() => {
        if (!mounted) return
        scheduleAutoFill()
    }, [mounted, products.length, scheduleAutoFill])

    const handleAddProduct = () => {
        setEditingProduct(null)
        setIsModalOpen(true)
    }

    const handleAddCategory = () => {
        setCategoryName('')
        setCategoryDescription('')
        setIsCategoryModalOpen(true)
    }

    const handleEditProduct = async (product: MenuItem) => {
        try {
            const fullProduct = await productsApi.getBranchProductById(restaurantId, product.id)
            setEditingProduct(fullProduct)
            setIsModalOpen(true)
        } catch (error) {
            console.error('Failed to fetch product details:', error)
            toast.error('Ürün detayları yüklenemedi')
        }
    }

    const handleDeleteProduct = async (id: string) => {
        if (!confirm('Bu ürünü silmek istediğinize emin misiniz?')) return

        try {
            await productsApi.deleteProduct(id)
            await refreshProducts(false)
            toast.success('Ürün başarıyla silindi.')
        } catch (error) {
            toast.error('Ürün silinirken bir hata oluştu.')
        }
    }

    const handleFormSubmit = async (data: Partial<CreateMenuItemInput>, file?: File) => {
        setIsSubmitting(true)

        try {
            let imageUrl = editingProduct?.image_url

            if (file) {
                try {
                    const uploadResult = await productsApi.uploadImage(file)
                    imageUrl = uploadResult.url
                } catch (uploadError) {
                    console.error('Resim yükleme hatası:', uploadError)
                    toast.error('Resim yüklenirken bir hata oluştu')
                    setIsSubmitting(false)
                    return
                }
            }

            if (editingProduct) {
                const nextPrice = Number(data.price)
                const hasBranchPriceContext =
                    editingProduct.base_price !== undefined ||
                    editingProduct.effective_price !== undefined
                const hasCustomBranchOverride =
                    editingProduct.override?.custom_price !== null &&
                    editingProduct.override?.custom_price !== undefined
                const currentBasePrice = Number(
                    editingProduct.base_price ?? editingProduct.price ?? 0,
                )

                const updatePayload: Partial<CreateMenuItemInput> & { image_url?: string } = {
                    ...data,
                    image_url: imageUrl,
                }

                // Branch custom override varken formdaki efektif fiyatı base price'a yazmayalım.
                if (
                    hasBranchPriceContext &&
                    hasCustomBranchOverride &&
                    Number.isFinite(currentBasePrice)
                ) {
                    updatePayload.price = currentBasePrice
                }

                await productsApi.updateProduct(editingProduct.id, {
                    ...updatePayload,
                })

                // Branch contextte custom_price override varsa, ekranda görünen efektif fiyatı da senkron tut.
                if (
                    hasCustomBranchOverride &&
                    Number.isFinite(nextPrice)
                ) {
                    try {
                        await productsApi.upsertBranchMenuOverride(restaurantId, editingProduct.id, {
                            custom_price: nextPrice,
                        })
                    } catch (overrideError) {
                        console.warn('Branch price override sync failed:', overrideError)
                    }
                }

                await refreshProducts(false)
                toast.success('Ürün güncellendi.')
            } else {
                await productsApi.createProduct({
                    ...(data as CreateMenuItemInput),
                    image_url: imageUrl,
                })
                await refreshProducts(false)
                toast.success('Yeni ürün eklendi.')
            }

            setIsModalOpen(false)
        } catch (error) {
            toast.error('İşlem başarısız oldu.')
            console.error(error)
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleCreateCategory = async () => {
        const name = categoryName.trim()
        if (!name) {
            toast.error('Kategori adı zorunludur.')
            return
        }

        setIsSubmitting(true)

        try {
            const created = await productsApi.createCategory({
                name,
                description: categoryDescription.trim() || undefined,
                restaurant_id: restaurantId,
            })
            setCategories((prev) => [...prev, created])
            toast.success('Kategori başarıyla eklendi.')
            setIsCategoryModalOpen(false)
        } catch (error) {
            console.error('Failed to create category:', error)
            toast.error('Kategori eklenirken bir hata oluştu.')
        } finally {
            setIsSubmitting(false)
        }
    }

    const summaryDate = mounted ? format(getNow(), 'dd MMMM yyyy EEEE', { locale: tr }) : ''
    const totalProducts = totalProductsCount ?? products.length

    if (!mounted) {
        return (
            <div className="min-h-screen bg-bg-app flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary-main" />
            </div>
        )
    }

    return (
        <div className="flex flex-col min-h-screen bg-bg-app">
            <SubHeaderSection
                title="ÜRÜN KATALOĞU"
                description="Menü ve ürün envanter yönetimi"
                isConnected={socketConnected}
                moduleColor="bg-rose-500"
                actions={(
                    <div className="flex items-center gap-2">
                        <Button onClick={handleAddCategory} variant="outline" className="gap-2 text-[10px] sm:text-xs">
                            <Plus size={16} />
                            YENİ KATEGORİ
                        </Button>
                        <Button onClick={handleAddProduct} variant="primary" className="gap-2 text-[10px] sm:text-xs">
                            <Plus size={16} />
                            YENİ ÜRÜN EKLE
                        </Button>
                    </div>
                )}
            />

            <main className="flex flex-col flex-1 pb-6 min-h-0">
                <FilterSection className="flex flex-col gap-4 shrink-0">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="flex flex-col md:flex-row items-center gap-4 flex-1 w-full">
                            <div className="relative w-[400px] max-w-full">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                                <input
                                    type="text"
                                    placeholder="ÜRÜN ADI VEYA İÇERİK İLE ARA..."
                                    className="w-full pl-9 pr-4 py-2.5 text-[11px] font-black uppercase tracking-wider border border-border-light bg-bg-app rounded-sm focus:outline-none focus:border-primary-main placeholder:text-text-muted transition-all shadow-sm"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                                {searchQuery && (
                                    <button
                                        onClick={() => setSearchQuery('')}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
                                    >
                                        <X size={14} />
                                    </button>
                                )}
                            </div>

                            <div className="relative">
                                <button
                                    onClick={() => setShowFilters(!showFilters)}
                                    className={cn(
                                        'flex items-center justify-center gap-2 px-6 py-3 border rounded-sm text-[10px] font-black uppercase tracking-widest transition-all',
                                        showFilters || activeFilterCount > 0
                                            ? 'bg-primary-subtle border-primary-main text-primary-main'
                                            : 'bg-bg-app border-border-light text-text-secondary hover:border-primary-main hover:text-primary-main'
                                    )}
                                >
                                    <Filter size={14} />
                                    <span>FİLTRELE</span>
                                    {activeFilterCount > 0 && (
                                        <span className="ml-1 px-1.5 py-0.5 bg-primary-main text-text-inverse text-[8px] rounded-full">
                                            {activeFilterCount}
                                        </span>
                                    )}
                                </button>

                                <FilterDropdown
                                    show={showFilters}
                                    filters={filters}
                                    setFilters={setFilters}
                                    activeFilterCount={activeFilterCount}
                                    clearFilters={clearFilters}
                                />
                            </div>

                            <ViewToggle value={viewMode} onChange={setViewMode} />
                        </div>

                        <ProductsStatsSummary
                            summaryDate={summaryDate}
                            socketConnected={socketConnected}
                            totalProducts={totalProducts}
                            categoryCount={categories.length}
                        />
                    </div>

                    <ActiveFiltersBar filters={filters} setFilters={setFilters} />

                    <div className="pt-4 border-t border-border-light mt-2">
                        <CategoryTabs
                            categories={categories}
                            activeCategoryId={activeCategoryId}
                            onCategoryChange={setActiveCategoryId}
                            onAddCategory={handleAddCategory}
                        />
                    </div>
                </FilterSection>

                <BodySection ref={scrollContainerRef} className="overflow-y-auto">
                    <div className="relative min-h-[24rem]">
                        {products.length > 0 ? (
                            <>
                                <div className={cn(
                                    'grid gap-6',
                                    viewMode === 'grid'
                                        ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
                                        : 'grid-cols-1'
                                )}>
                                    {products.map((product) => (
                                        <ProductCard
                                            key={product.id}
                                            product={product}
                                            onEdit={handleEditProduct}
                                            onDelete={handleDeleteProduct}
                                            variant={viewMode}
                                        />
                                    ))}
                                </div>

                                <div ref={observerTarget} className="py-16 flex flex-col items-center justify-center w-full gap-4">
                                    {isLoadingMore && hasMore && (
                                        <div className="flex items-center gap-3 text-primary-main">
                                            <Loader2 size={24} className="animate-spin" />
                                            <span className="text-[10px] font-black uppercase tracking-[0.3em]">Ürünler Yükleniyor...</span>
                                        </div>
                                    )}
                                    {!isLoadingMore && !hasMore && (
                                        <div className="flex flex-col items-center gap-2 opacity-30">
                                            <div className="w-10 h-1px bg-border-light" />
                                            <p className="text-[9px] font-black text-text-muted uppercase tracking-[0.4em]">KATALOĞUN SONUNA GELDİNİZ</p>
                                        </div>
                                    )}
                                </div>
                            </>
                        ) : (
                            <EmptyProductsState
                                onReset={() => {
                                    setSearchQuery('')
                                    setActiveCategoryId(null)
                                    clearFilters()
                                }}
                            />
                        )}

                        {isRefreshing && <ProductsLoadingOverlay viewMode={viewMode} />}
                    </div>
                </BodySection>
            </main>

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingProduct ? 'ÜRÜN DÜZENLEME' : 'YENİ ÜRÜN TANIMLAMA'}
                className="max-w-5xl"
            >
                <ProductForm
                    initialData={editingProduct || undefined}
                    categories={categories}
                    ingredients={allIngredients}
                    restaurantId={restaurantId}
                    onSubmit={handleFormSubmit}
                    onCancel={() => setIsModalOpen(false)}
                    isLoading={isSubmitting}
                />
            </Modal>

            <Modal
                isOpen={isCategoryModalOpen}
                onClose={() => setIsCategoryModalOpen(false)}
                title="YENİ KATEGORİ"
                className="max-w-md"
            >
                <CategoryFormModal
                    categoryName={categoryName}
                    categoryDescription={categoryDescription}
                    onCategoryNameChange={setCategoryName}
                    onCategoryDescriptionChange={setCategoryDescription}
                    onClose={() => setIsCategoryModalOpen(false)}
                    onSubmit={handleCreateCategory}
                    isSubmitting={isSubmitting}
                />
            </Modal>
        </div>
    )
}
