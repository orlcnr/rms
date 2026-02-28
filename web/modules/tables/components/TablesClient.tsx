'use client'

import React, { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Download, LayoutGrid, Loader2, RefreshCcw } from 'lucide-react'
import { Area, Table, CreateAreaInput, CreateTableInput, TableQrData } from '../types'
import { AreaTabs } from './AreaTabs'
import { TableGrid } from './TableGrid'
import { AreaForm } from './AreaForm'
import { TableForm } from './TableForm'
import { tablesApi } from '../services/tables.service'
import { Modal } from '@/modules/shared/components/Modal'
import { Button } from '@/modules/shared/components/Button'
import { RmsSwitch } from '@/modules/shared/components/RmsSwitch'
import { SubHeaderSection, BodySection } from '@/modules/shared/components/layout'
import { TableBoardToolbar } from './TableBoardToolbar'
import { format } from 'date-fns'
import { tr } from 'date-fns/locale'
import { getNow } from '@/modules/shared/utils/date'
import { toast } from 'sonner'
import { cn } from '@/modules/shared/utils/cn'
import { TableStatus } from '../types'
import { useSocketStore } from '@/modules/shared/api/socket'

interface TablesClientProps {
    restaurantId: string
    initialAreas: Area[]
    initialTables: Table[]
}

export function TablesClient({ restaurantId, initialAreas, initialTables }: TablesClientProps) {
    const router = useRouter()
    const [mounted, setMounted] = useState(false)
    const [areas, setAreas] = useState<Area[]>(initialAreas)
    const [tables, setTables] = useState<Table[]>(initialTables)
    const [activeAreaId, setActiveAreaId] = useState<string | null>(null)
    const [searchQuery, setSearchQuery] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [isAdminMode, setIsAdminMode] = useState(false) // Admin/Operation mode toggle

    // Hydration fix - wait for mount before rendering client-specific state
    useEffect(() => {
        setMounted(true)
    }, [])

    // Modal States
    const [isAreaModalOpen, setIsAreaModalOpen] = useState(false)
    const [isTableModalOpen, setIsTableModalOpen] = useState(false)
    const [editingArea, setEditingArea] = useState<Area | null>(null)
    const [editingTable, setEditingTable] = useState<Table | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [qrTable, setQrTable] = useState<Table | null>(null)
    const [qrData, setQrData] = useState<TableQrData | null>(null)
    const [isLoadingQr, setIsLoadingQr] = useState(false)

    // Polling for operation mode - refresh data every 30 seconds
    useEffect(() => {
        if (isAdminMode) return // No polling in admin mode

        const interval = setInterval(async () => {
            try {
                const [newAreas, newTables] = await Promise.all([
                    tablesApi.getAreas(restaurantId),
                    tablesApi.getTables(restaurantId),
                ])
                setAreas(newAreas)
                setTables(newTables)
            } catch (error) {
                console.error('Polling error:', error)
            }
        }, 30000) // 30 seconds

        return () => clearInterval(interval)
    }, [isAdminMode, restaurantId])

    // Socket connection for real-time updates
    const { connect, disconnect, on, off, isConnected } = useSocketStore()

    // Debug: Log connection status
    useEffect(() => {
        console.log('[TablesClient] Socket connection status:', isConnected)
    }, [isConnected])

    useEffect(() => {
        // Skip socket connection if not mounted yet
        if (!mounted) return

        // Connect to socket when component mounts
        connect(restaurantId)

        // Handle order status updates
        const handleOrderUpdate = (data: any) => {
            console.log('[TablesClient] Order update received:', data)

            // Check if it's an order update (has table_id)
            if (data.table_id) {
                console.log('[TablesClient] Refreshing tables due to order update')
                // Order update - refresh tables to get updated active_order
                tablesApi.getTables(restaurantId).then(newTables => {
                    console.log('[TablesClient] Tables refreshed, table count:', newTables.length)
                    setTables(newTables)
                }).catch(err => {
                    console.error('[TablesClient] Error refreshing tables:', err)
                })
            }
            // Check if it's a table entity update (has id and status directly)
            else if (data.id && data.status) {
                console.log('[TablesClient] Table entity update received')
                // It's a table update - refresh tables
                tablesApi.getTables(restaurantId).then(newTables => {
                    setTables(newTables)
                }).catch(console.error)
            }
        }

        on('order_status_updated', handleOrderUpdate)
        on('new_order', handleOrderUpdate)

        return () => {
            off('order_status_updated')
            off('new_order')
            disconnect()
        }
    }, [restaurantId, mounted])

    // Filtered Tables - memoized
    const filteredTables = useMemo(() => {
        let result = tables

        if (activeAreaId) {
            result = result.filter(t => t.area_id === activeAreaId)
        }

        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase().trim()
            result = result.filter(t =>
                t.name.toLowerCase().includes(query) ||
                (t.area?.name && t.area.name.toLowerCase().includes(query))
            )
        }

        return result
    }, [tables, activeAreaId, searchQuery])

    // Statistics
    const availableCount = tables.filter(t => t.status === 'available').length
    const occupiedCount = tables.filter(t => t.status === 'occupied').length
    const summaryDate = mounted ? format(getNow(), 'dd MMMM yyyy EEEE', { locale: tr }) : ''

    // Hydration fix - return loading state until mounted
    if (!mounted) {
        return (
            <div className="min-h-screen bg-bg-app flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-main" />
            </div>
        )
    }

    // Refresh Data
    const refreshData = async () => {
        setIsLoading(true)
        try {
            const [newAreas, newTables] = await Promise.all([
                tablesApi.getAreas(restaurantId),
                tablesApi.getTables(restaurantId)
            ])
            setAreas(newAreas)
            setTables(newTables)
        } catch (error) {
            toast.error('Veriler güncellenirken hata oluştu')
        } finally {
            setIsLoading(false)
        }
    }

    // Area Handlers
    const handleAddArea = () => {
        setEditingArea(null)
        setIsAreaModalOpen(true)
    }

    const handleEditArea = (area: Area) => {
        setEditingArea(area)
        setIsAreaModalOpen(true)
    }

    const handleDeleteArea = async (id: string) => {
        if (!confirm('Bu salonu ve içindeki masaları silmek istediğinize emin misiniz?')) return
        try {
            await tablesApi.deleteArea(id)
            setAreas(prev => prev.filter(a => a.id !== id))
            setTables(prev => prev.filter(t => t.area_id !== id))
            if (activeAreaId === id) setActiveAreaId(null)
            toast.success('Salon silindi')
        } catch (error) {
            toast.error('Salon silinemedi')
        }
    }

    const handleAreaSubmit = async (data: Partial<CreateAreaInput>) => {
        setIsSubmitting(true)
        try {
            if (editingArea) {
                const updated = await tablesApi.updateArea(editingArea.id, data)
                setAreas(prev => prev.map(a => a.id === editingArea.id ? updated : a))
                toast.success('Salon güncellendi')
            } else {
                const created = await tablesApi.createArea({ ...data as CreateAreaInput, restaurant_id: restaurantId })
                setAreas(prev => [...prev, created])
                toast.success('Yeni salon eklendi')
            }
            setIsAreaModalOpen(false)
        } catch (error) {
            toast.error('İşlem başarısız')
        } finally {
            setIsSubmitting(false)
        }
    }

    // Table Handlers
    const handleAddTable = () => {
        setEditingTable(null)
        setIsTableModalOpen(true)
    }

    const handleEditTable = (table: Table) => {
        setEditingTable(table)
        setIsTableModalOpen(true)
    }

    const handleTableSubmit = async (data: Partial<CreateTableInput>) => {
        setIsSubmitting(true)
        try {
            if (editingTable) {
                const updated = await tablesApi.updateTable(editingTable.id, data)
                setTables(prev => prev.map(t => t.id === editingTable.id ? updated : t))
                toast.success('Masa güncellendi')
            } else {
                const created = await tablesApi.createTable({ ...data as CreateTableInput, restaurant_id: restaurantId })
                setTables(prev => [...prev, created])
                toast.success('Yeni masa eklendi')
            }
            setIsTableModalOpen(false)
        } catch (error) {
            toast.error('İşlem başarısız')
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleDeleteTable = async (id: string) => {
        if (!confirm('Bu masayı silmek istediğinize emin misiniz?')) return
        try {
            await tablesApi.deleteTable(id)
            setTables(prev => prev.filter(t => t.id !== id))
            toast.success('Masa silindi')
        } catch (error) {
            toast.error('Masa silinemedi')
        }
    }

    const handleShowQr = async (table: Table) => {
        setQrTable(table)
        setIsLoadingQr(true)
        try {
            const data = await tablesApi.getTableQr(table.id, restaurantId)
            setQrData(data)
        } catch (error) {
            toast.error('QR Kod yüklenemedi')
        } finally {
            setIsLoadingQr(false)
        }
    }

    const handleDownloadQr = () => {
        if (!qrTable) return
        tablesApi.downloadTableQrPdf(qrTable.id, restaurantId, 'Restoran')
    }

    // Operation Mode: Handle table click for POS routing
    const handleTableClick = (table: Table) => {
        // Only handle clicks in operation mode (not admin mode)
        if (isAdminMode) return

        // Sadece tableId ile yönlendir - sipariş kontrolü POS sayfasında yapılacak
        router.push(`/orders/pos/${table.id}`)
    }

    const handleRotateQr = async () => {
        if (!qrTable) return
        setIsLoadingQr(true)
        try {
            await tablesApi.rotateQrCode(qrTable.id)
            const data = await tablesApi.getTableQr(qrTable.id, restaurantId)
            setQrData(data)
            toast.success('QR Kod yenilendi')
        } catch (error) {
            toast.error('QR Kod yenilenemedi')
        } finally {
            setIsLoadingQr(false)
        }
    }

    const handleDownloadAllQrs = async () => {
        try {
            toast.promise(tablesApi.downloadAllQrsPdf(restaurantId, 'Restoran'), {
                loading: 'PDF hazırlanıyor...',
                success: 'QR kodlar indirildi',
                error: 'İndirme sırasında hata oluştu'
            })
        } catch (error) {
            console.error(error)
        }
    }

    return (
        <div className="flex flex-col min-h-screen bg-bg-app">
            <SubHeaderSection
                title="MASA YÖNETİMİ"
                description="Salon ve masa düzeni yönetimi"
                moduleColor="bg-cyan-500"
                isConnected={isConnected}
                onRefresh={refreshData}
                actions={
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 mr-4 border-r border-border-light pr-4">
                            <span className={cn(
                                "text-[10px] font-bold uppercase tracking-wider",
                                !isAdminMode ? "text-primary-main" : "text-text-muted"
                            )}>
                                Operasyon
                            </span>
                            <RmsSwitch
                                checked={isAdminMode}
                                onChange={setIsAdminMode}
                                size="sm"
                            />
                            <span className={cn(
                                "text-[10px] font-bold uppercase tracking-wider",
                                isAdminMode ? "text-primary-main" : "text-text-muted"
                            )}>
                                Yönetici
                            </span>
                        </div>
                        <div className={cn("flex items-center gap-3", !isAdminMode && "hidden")}>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleDownloadAllQrs}
                            >
                                <Download size={14} className="mr-2" />
                                QR İNDİR
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleAddArea}
                            >
                                <Plus size={14} className="mr-2" />
                                ALAN EKLE
                            </Button>
                            <Button
                                variant="primary"
                                onClick={handleAddTable}
                            >
                                <Plus size={18} className="mr-2" />
                                YENİ MASA EKLE
                            </Button>
                        </div>
                    </div>
                }
            />

            <main className="flex flex-col flex-1 pb-6 min-h-0">
                <TableBoardToolbar
                    searchQuery={searchQuery}
                    onSearchChange={setSearchQuery}
                    stats={{
                        total: tables.length,
                        available: availableCount,
                        occupied: occupiedCount
                    }}
                    summaryDate={summaryDate}
                    socketConnected={isConnected}
                >
                    <AreaTabs
                        areas={areas}
                        activeAreaId={activeAreaId}
                        onAreaChange={setActiveAreaId}
                        onAddArea={handleAddArea}
                        onEditArea={handleEditArea}
                        onDeleteArea={handleDeleteArea}
                        isAdminMode={isAdminMode}
                    />
                </TableBoardToolbar>

                <BodySection>
                    <TableGrid
                        tables={filteredTables}
                        isAdminMode={isAdminMode}
                        onEdit={handleEditTable}
                        onDelete={handleDeleteTable}
                        onShowQr={handleShowQr}
                        onTableClick={handleTableClick}
                    />
                </BodySection>
            </main>

            {/* QR Modal */}
            <Modal
                isOpen={!!qrTable}
                onClose={() => {
                    setQrTable(null)
                    setQrData(null)
                }}
                title={`${qrTable?.name} QR Kodu`}
            >
                <div className="flex flex-col items-center justify-center p-6 space-y-6">
                    <div className="relative w-64 h-64 bg-bg-surface border border-border-light rounded-sm p-4 flex items-center justify-center">
                        {isLoadingQr ? (
                            <div className="absolute inset-0 flex items-center justify-center bg-bg-muted/50 backdrop-blur-sm rounded-sm">
                                <Loader2 className="w-8 h-8 text-primary-main animate-spin" />
                            </div>
                        ) : qrData ? (
                            <img src={qrData.qrImageDataUrl} alt="QR Code" className="w-full h-full object-contain" />
                        ) : (
                            <div className="flex items-center justify-center text-danger-main font-bold">Hata!</div>
                        )}
                    </div>

                    <div className="w-full flex gap-3">
                        <Button
                            variant="outline"
                            onClick={() => {
                                setQrTable(null)
                                setQrData(null)
                            }}
                            className="flex-1"
                        >
                            Kapat
                        </Button>
                        <Button
                            variant="outline"
                            onClick={handleRotateQr}
                            disabled={isLoadingQr}
                            className="flex-1"
                        >
                            <RefreshCcw className={cn("w-4 h-4 mr-2", isLoadingQr && "animate-spin")} />
                            Yenile
                        </Button>
                        <Button
                            variant="primary"
                            onClick={handleDownloadQr}
                            disabled={!qrData}
                            className="flex-1"
                        >
                            <Download className="w-4 h-4 mr-2" />
                            PDF İndir
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Modals */}
            <Modal
                isOpen={isAreaModalOpen}
                onClose={() => setIsAreaModalOpen(false)}
                title={editingArea ? 'Salon Düzenle' : 'Yeni Salon Ekle'}
            >
                <AreaForm
                    initialData={editingArea || undefined}
                    onSubmit={handleAreaSubmit}
                    onCancel={() => setIsAreaModalOpen(false)}
                    isLoading={isSubmitting}
                />
            </Modal>

            <Modal
                isOpen={isTableModalOpen}
                onClose={() => setIsTableModalOpen(false)}
                title={editingTable ? 'Masa Düzenle' : 'Yeni Masa Ekle'}
            >
                <TableForm
                    initialData={editingTable || undefined}
                    areas={areas}
                    onSubmit={handleTableSubmit}
                    onCancel={() => setIsTableModalOpen(false)}
                    isLoading={isSubmitting}
                />
            </Modal>
        </div>
    )
}
