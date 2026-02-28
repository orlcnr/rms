'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { Plus, Search, Filter, Loader2, Package, ArrowRight, X, LayoutGrid, List } from 'lucide-react'
import { Category, MenuItem, PaginatedResponse, CreateMenuItemInput, ProductFilters, StockStatus, SalesStatus, FILTER_OPTIONS } from '../types'
import { CategoryTabs } from './CategoryTabs'
import { ProductCard } from './ProductCard'
import { ProductForm } from './ProductForm'
import { useIntersectionObserver } from '@/modules/shared/hooks/useIntersectionObserver'
import { useDebounce } from '@/modules/shared/hooks/useDebounce'
import { Modal } from '@/modules/shared/components/Modal'
import { SubHeaderSection, FilterSection, BodySection } from '@/modules/shared/components/layout'
import { Button } from '@/modules/shared/components/Button'
import { useSocketStore } from '@/modules/shared/api/socket'
import { productsApi } from '../services/products.service'
import { format } from 'date-fns'
import { tr } from 'date-fns/locale'
import { getNow } from '@/modules/shared/utils/date'
import { toast } from 'sonner'
import { inventoryApi } from '../../inventory/services/inventory.service'
import { Ingredient } from '../../inventory/types'
import { cn } from '@/modules/shared/utils/cn'

interface ProductsClientProps {
    restaurantId: string
    initialCategories: Category[]
    initialProductsResponse: PaginatedResponse<MenuItem>
}

export function ProductsClient({ restaurantId, initialCategories, initialProductsResponse }: ProductsClientProps) {
    const { isConnected: socketConnected } = useSocketStore()
    const [mounted, setMounted] = useState(false)
    const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null)
    const [searchQuery, setSearchQuery] = useState('')
    const debouncedSearch = useDebounce(searchQuery, 300)

    // View toggle
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

    // Advanced filters
    const [filters, setFilters] = useState<ProductFilters>({
        stockStatus: 'all',
        salesStatus: 'all',
        minPrice: undefined,
        maxPrice: undefined,
    })
    const [showFilters, setShowFilters] = useState(false)

    const [products, setProducts] = useState<MenuItem[]>(initialProductsResponse.items)
    const [page, setPage] = useState(1)
    const [hasMore, setHasMore] = useState(initialProductsResponse.meta.currentPage < initialProductsResponse.meta.totalPages)
    const [isLoading, setIsLoading] = useState(false)

    // Form States
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingProduct, setEditingProduct] = useState<MenuItem | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [allIngredients, setAllIngredients] = useState<Ingredient[]>([])

    // Mounted check for hydration
    useEffect(() => {
        setMounted(true)
    }, [])

    // Fetch all ingredients for recipe management
    useEffect(() => {
        const fetchIngredients = async () => {
            try {
                const response = await inventoryApi.getIngredients({ limit: 100 })
                setAllIngredients(response.items)
            } catch (error) {
                console.error('Failed to fetch ingredients for recipes:', error)
            }
        }
        fetchIngredients()
    }, [])

    // Reset list when filters change
    useEffect(() => {
        const refreshData = async () => {
            setIsLoading(true)
            try {
                const response = await productsApi.getProducts(restaurantId, {
                    page: 1,
                    limit: 12,
                    search: debouncedSearch,
                    categoryId: activeCategoryId || undefined,
                    // New filters
                    stockStatus: filters.stockStatus !== 'all' ? filters.stockStatus : undefined,
                    salesStatus: filters.salesStatus !== 'all' ? filters.salesStatus : undefined,
                    minPrice: filters.minPrice,
                    maxPrice: filters.maxPrice,
                })
                setProducts(response.items)
                setPage(1)
                setHasMore(response.meta.currentPage < response.meta.totalPages)
            } catch (error) {
                console.error('Failed to filter products:', error)
            } finally {
                setIsLoading(false)
            }
        }

        if (debouncedSearch !== '' || activeCategoryId !== null || filters.stockStatus !== 'all' || filters.salesStatus !== 'all' || filters.minPrice !== undefined || filters.maxPrice !== undefined) {
            refreshData()
        } else {
            setProducts(initialProductsResponse.items)
            setPage(1)
            setHasMore(initialProductsResponse.meta.currentPage < initialProductsResponse.meta.totalPages)
        }
    }, [debouncedSearch, activeCategoryId, restaurantId, initialProductsResponse, filters])

    const loadMore = useCallback(async () => {
        if (isLoading || !hasMore) return

        setIsLoading(true)
        const nextPage = page + 1
        try {
            const response = await productsApi.getProducts(restaurantId, {
                page: nextPage,
                limit: 12,
                search: debouncedSearch,
                categoryId: activeCategoryId || undefined
            })

            setProducts(prev => [...prev, ...response.items])
            setPage(nextPage)
            setHasMore(response.meta.currentPage < response.meta.totalPages)
        } catch (error) {
            console.error('Failed to load more products:', error)
        } finally {
            setIsLoading(false)
        }
    }, [page, isLoading, hasMore, restaurantId, debouncedSearch, activeCategoryId])

    const observerTarget = useIntersectionObserver(loadMore, [loadMore])

    // Form Handlers
    const handleAddProduct = () => {
        setEditingProduct(null)
        setIsModalOpen(true)
    }

    const handleEditProduct = async (product: MenuItem) => {
        try {
            // Ürün detaylarını reçete dahil getir
            const fullProduct = await productsApi.getProductById(product.id)
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
            setProducts(prev => prev.filter(p => p.id !== id))
            toast.success('Ürün başarıyla silindi.')
        } catch (error) {
            toast.error('Ürün silinirken bir hata oluştu.')
        }
    }

    const handleFormSubmit = async (data: Partial<CreateMenuItemInput>, file?: File) => {
        setIsSubmitting(true)
        try {
            let imageUrl = editingProduct?.image_url

            // Yeni dosya seçildiyse önce yükle
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
                const updated = await productsApi.updateProduct(editingProduct.id, {
                    ...data,
                    image_url: imageUrl,
                })
                setProducts(prev => prev.map(p => p.id === editingProduct.id ? updated : p))
                toast.success('Ürün güncellendi.')
            } else {
                const created = await productsApi.createProduct({
                    ...data as CreateMenuItemInput,
                    image_url: imageUrl,
                })
                setProducts(prev => [created, ...prev])
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

    // Calculate active filter count
    const activeFilterCount = useMemo(() => {
        let count = 0
        if (filters.stockStatus !== 'all') count++
        if (filters.salesStatus !== 'all') count++
        if (filters.minPrice !== undefined) count++
        if (filters.maxPrice !== undefined) count++
        return count
    }, [filters])

    // Clear all filters
    const clearFilters = () => {
        setFilters({
            stockStatus: 'all',
            salesStatus: 'all',
            minPrice: undefined,
            maxPrice: undefined,
        })
    }

    const summaryDate = mounted ? format(getNow(), 'dd MMMM yyyy EEEE', { locale: tr }) : ''

    const totalProducts = initialProductsResponse.meta.totalItems || products.length

    if (!mounted) {
        return <div className="min-h-screen bg-bg-app flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary-main" />
        </div>
    }

    return (
        <div className="flex flex-col min-h-screen bg-bg-app">
            {/* Sub Header */}
            <SubHeaderSection
                title="ÜRÜN KATALOĞU"
                description="Menü ve ürün envanter yönetimi"
                isConnected={socketConnected}
                moduleColor="bg-rose-500"
                actions={
                    <Button onClick={handleAddProduct} variant="primary" className="gap-2 text-[10px] sm:text-xs">
                        <Plus size={16} />
                        YENİ ÜRÜN EKLE
                    </Button>
                }
            />

            <main className="flex flex-col flex-1 pb-6 min-h-0">
                {/* Search and Categories Panel */}
                <FilterSection className="flex flex-col gap-4 shrink-0">
                    {/* Top Row: Search + Filters + View Toggle */}
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

                            {/* Filter Button with Badge */}
                            <div className="relative">
                                <button
                                    onClick={() => setShowFilters(!showFilters)}
                                    className={cn(
                                        "flex items-center justify-center gap-2 px-6 py-3 border rounded-sm text-[10px] font-black uppercase tracking-widest transition-all",
                                        showFilters || activeFilterCount > 0
                                            ? "bg-primary-subtle border-primary-main text-primary-main"
                                            : "bg-bg-app border-border-light text-text-secondary hover:border-primary-main hover:text-primary-main"
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

                                {/* Filter Dropdown Panel */}
                                {showFilters && (
                                    <div className="absolute top-full left-0 mt-2 w-80 bg-bg-surface border border-border-light rounded-sm shadow-lg z-20 p-4 space-y-4">
                                        {/* Stock Status */}
                                        <div>
                                            <label className="block text-[10px] font-black uppercase tracking-widest text-text-secondary mb-2">Stok Durumu</label>
                                            <div className="flex flex-wrap gap-2">
                                                {FILTER_OPTIONS.stockStatus.map((option) => (
                                                    <button
                                                        key={option.value}
                                                        onClick={() => setFilters(f => ({ ...f, stockStatus: option.value as StockStatus }))}
                                                        className={cn(
                                                            "px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-sm border transition-all",
                                                            filters.stockStatus === option.value
                                                                ? "bg-primary-main border-primary-main text-text-inverse"
                                                                : "bg-bg-app border-border-light text-text-secondary hover:border-primary-main"
                                                        )}
                                                    >
                                                        {option.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Sales Status */}
                                        <div>
                                            <label className="block text-[10px] font-black uppercase tracking-widest text-text-secondary mb-2">Satış Durumu</label>
                                            <div className="flex flex-wrap gap-2">
                                                {FILTER_OPTIONS.salesStatus.map((option) => (
                                                    <button
                                                        key={option.value}
                                                        onClick={() => setFilters(f => ({ ...f, salesStatus: option.value as SalesStatus }))}
                                                        className={cn(
                                                            "px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-sm border transition-all",
                                                            filters.salesStatus === option.value
                                                                ? "bg-primary-main border-primary-main text-text-inverse"
                                                                : "bg-bg-app border-border-light text-text-secondary hover:border-primary-main"
                                                        )}
                                                    >
                                                        {option.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Price Range */}
                                        <div>
                                            <label className="block text-[10px] font-black uppercase tracking-widest text-text-secondary mb-2">Fiyat Aralığı (TL)</label>
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="number"
                                                    placeholder="Min"
                                                    className="w-full bg-bg-app border border-border-light rounded-sm py-2 px-3 text-text-primary text-xs font-bold outline-none focus:border-primary-main transition-all"
                                                    value={filters.minPrice || ''}
                                                    onChange={(e) => setFilters(f => ({ ...f, minPrice: e.target.value ? Number(e.target.value) : undefined }))}
                                                />
                                                <span className="text-text-muted">-</span>
                                                <input
                                                    type="number"
                                                    placeholder="Max"
                                                    className="w-full bg-bg-app border border-border-light rounded-sm py-2 px-3 text-text-primary text-xs font-bold outline-none focus:border-primary-main transition-all"
                                                    value={filters.maxPrice || ''}
                                                    onChange={(e) => setFilters(f => ({ ...f, maxPrice: e.target.value ? Number(e.target.value) : undefined }))}
                                                />
                                            </div>
                                        </div>

                                        {/* Clear Filters */}
                                        {activeFilterCount > 0 && (
                                            <button
                                                onClick={clearFilters}
                                                className="w-full py-2 text-[10px] font-black uppercase tracking-widest text-danger-main hover:text-danger-hover transition-all"
                                            >
                                                Temizle ({activeFilterCount})
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* View Toggle */}
                            <div className="flex items-center gap-1 bg-bg-app border border-border-light rounded-sm p-1">
                                <button
                                    onClick={() => setViewMode('grid')}
                                    className={cn(
                                        "p-2 rounded-sm transition-all",
                                        viewMode === 'grid'
                                            ? "bg-primary-main text-text-inverse"
                                            : "text-text-muted hover:text-text-primary"
                                    )}
                                >
                                    <LayoutGrid size={16} />
                                </button>
                                <button
                                    onClick={() => setViewMode('list')}
                                    className={cn(
                                        "p-2 rounded-sm transition-all",
                                        viewMode === 'list'
                                            ? "bg-primary-main text-text-inverse"
                                            : "text-text-muted hover:text-text-primary"
                                    )}
                                >
                                    <List size={16} />
                                </button>
                            </div>
                        </div>

                        {/* Stats Summary - Standardized Layout */}
                        <div className="hidden xl:flex items-center gap-6 ml-auto px-6 border-l border-border-light">
                            <div className="flex flex-col justify-center text-right border-r border-border-light pr-6">
                                <p className="text-sm font-black text-orange-500 uppercase tracking-widest leading-none">
                                    {summaryDate}
                                </p>
                                <div className="flex items-center justify-end gap-1.5 mt-1.5">
                                    <div className={cn(
                                        "w-1.5 h-1.5 rounded-full",
                                        socketConnected ? "bg-success-main animate-pulse" : "bg-danger-main"
                                    )} />
                                    <p className="text-[9px] font-bold text-text-muted uppercase tracking-tighter">
                                        Günün Özeti
                                    </p>
                                </div>
                            </div>
                            <div className="text-center w-16">
                                <p className="text-sm font-black text-text-primary tabular-nums">{totalProducts}</p>
                                <p className="text-[9px] font-bold text-text-muted uppercase tracking-tighter">Ürün</p>
                            </div>
                            <div className="text-center w-16">
                                <p className="text-sm font-black text-success-main tabular-nums">{initialCategories.length}</p>
                                <p className="text-[9px] font-bold text-text-muted uppercase tracking-tighter">Kategori</p>
                            </div>
                        </div>
                    </div>

                    {/* Active Filters Display */}
                    {activeFilterCount > 0 && (
                        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border-light">
                            <span className="text-[10px] font-black uppercase tracking-widest text-text-muted">Aktif Filtreler:</span>
                            {filters.stockStatus !== 'all' && (
                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-primary-subtle text-primary-main text-[10px] font-black uppercase rounded-sm">
                                    Stok: {FILTER_OPTIONS.stockStatus.find(o => o.value === filters.stockStatus)?.label}
                                    <button onClick={() => setFilters(f => ({ ...f, stockStatus: 'all' }))} className="hover:text-primary-hover">
                                        <X size={10} />
                                    </button>
                                </span>
                            )}
                            {filters.salesStatus !== 'all' && (
                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-primary-subtle text-primary-main text-[10px] font-black uppercase rounded-sm">
                                    Satış: {FILTER_OPTIONS.salesStatus.find(o => o.value === filters.salesStatus)?.label}
                                    <button onClick={() => setFilters(f => ({ ...f, salesStatus: 'all' }))} className="hover:text-primary-hover">
                                        <X size={10} />
                                    </button>
                                </span>
                            )}
                            {(filters.minPrice !== undefined || filters.maxPrice !== undefined) && (
                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-primary-subtle text-primary-main text-[10px] font-black uppercase rounded-sm">
                                    Fiyat: {filters.minPrice || '0'} - {filters.maxPrice || '∞'} TL
                                    <button onClick={() => setFilters(f => ({ ...f, minPrice: undefined, maxPrice: undefined }))} className="hover:text-primary-hover">
                                        <X size={10} />
                                    </button>
                                </span>
                            )}
                        </div>
                    )}

                    <div className="pt-4 border-t border-border-light mt-2">
                        <CategoryTabs
                            categories={initialCategories}
                            activeCategoryId={activeCategoryId}
                            onCategoryChange={setActiveCategoryId}
                            onAddCategory={() => console.log('Add category')}
                        />
                    </div>
                </FilterSection>

                {/* Products Grid or List */}
                <BodySection className="overflow-y-auto">
                    {products.length > 0 ? (
                        <>
                            <div className={cn(
                                "grid gap-6",
                                viewMode === 'grid'
                                    ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                                    : "grid-cols-1"
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

                            {/* Infinite Scroll Sensor */}
                            <div ref={observerTarget} className="py-16 flex flex-col items-center justify-center w-full gap-4">
                                {isLoading && hasMore && (
                                    <div className="flex items-center gap-3 text-primary-main">
                                        <Loader2 size={24} className="animate-spin" />
                                        <span className="text-[10px] font-black uppercase tracking-[0.3em]">Ürünler Yükleniyor...</span>
                                    </div>
                                )}
                                {!isLoading && !hasMore && (
                                    <div className="flex flex-col items-center gap-2 opacity-30">
                                        <div className="w-10 h-1px bg-border-light" />
                                        <p className="text-[9px] font-black text-text-muted uppercase tracking-[0.4em]">KATALOĞUN SONUNA GELDİNİZ</p>
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="bg-bg-surface border border-border-light rounded-sm py-32 flex flex-col items-center justify-center text-center shadow-sm">
                            <div className="w-20 h-20 bg-bg-app rounded-full flex items-center justify-center mb-6 text-text-muted/20">
                                <Package size={40} />
                            </div>
                            <h3 className="text-xl font-black text-text-primary uppercase tracking-tight mb-2">ÜRÜN BULUNAMADI</h3>
                            <p className="text-text-muted text-xs font-bold uppercase tracking-widest max-w-sm opacity-60">
                                Arama kriterlerinize uygun ürün mevcut değil. Lütfen filtreleri kontrol edin.
                            </p>
                            <button
                                onClick={() => { setSearchQuery(''); setActiveCategoryId(null); }}
                                className="mt-8 flex items-center gap-2 text-primary-main text-[10px] font-black uppercase tracking-widest hover:underline"
                            >
                                TÜM ÜRÜNLERİ GÖSTER <ArrowRight size={14} />
                            </button>
                        </div>
                    )}
                </BodySection>
            </main>

            {/* Add/Edit Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingProduct ? 'ÜRÜN DÜZENLEME' : 'YENİ ÜRÜN TANIMLAMA'}
                className="max-w-5xl"
            >
                <ProductForm
                    initialData={editingProduct || undefined}
                    categories={initialCategories}
                    ingredients={allIngredients}
                    restaurantId={restaurantId}
                    onSubmit={handleFormSubmit}
                    onCancel={() => setIsModalOpen(false)}
                    isLoading={isSubmitting}
                />
            </Modal>
        </div >
    )
}
