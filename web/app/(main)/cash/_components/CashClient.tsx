// ============================================
// CASH MODULE - CLIENT COMPONENT
// ============================================

'use client'

import { useState, useEffect } from 'react'
import { Plus, Search, Wallet, TrendingUp, Banknote } from 'lucide-react'
import { useCash } from '@/modules/cash/hooks/useCash'
import {
  CashOpenModal,
  CashCloseModal,
  CashRegisterModal,
} from '@/modules/cash/components'
import { CashRegisterWithStatus, ActiveSessionWrapper, CashSummaryData, CashCloseData } from '@/modules/cash/types'
import { ActiveSessionCard } from './ActiveSessionCard'
import { RegistersList } from './RegistersList'
import { SubHeaderSection, FilterSection, BodySection } from '@/modules/shared/components/layout'
import { Button } from '@/modules/shared/components/Button'
import { useSocketStore } from '@/modules/shared/api/socket'
import { formatCurrency } from '@/modules/shared/utils/numeric'
import { cn } from '@/modules/shared/utils/cn'
import { format } from 'date-fns'
import { tr } from 'date-fns/locale'
import { getNow } from '@/modules/shared/utils/date'

interface CashClientProps {
  restaurantId: string
  initialRegisters: CashRegisterWithStatus[]
  initialSessions: ActiveSessionWrapper[]
  initialSummary: CashSummaryData | null
}

export default function CashClient({
  restaurantId,
  initialRegisters,
  initialSessions,
  initialSummary,
}: CashClientProps) {
  // State from hook
  const {
    registersWithStatus,
    activeSessions,
    summary,
    fetchRegistersWithStatus,
    fetchActiveSessions,
    fetchSessionSummary,
    openSession,
    closeSession,
    createRegister,
    deleteRegister,
    isLoading,
    isSyncing,
  } = useCash({
    restaurantId,
    initialRegisters,
    initialSessions,
    initialSummary,
  })

  // Modal states
  const [selectedRegister, setSelectedRegister] = useState<{ id: string; name: string } | null>(null)
  const [isOpenModalOpen, setIsOpenModalOpen] = useState(false)
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false)
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false)
  const [editingRegister, setEditingRegister] = useState<{ id: string; name: string } | null>(null)

  // Computed values
  const currentSession = activeSessions?.[0] || null
  const currentSummary = summary || {
    netSales: 0,
    totalTips: 0,
    totalCash: 0,
    cashTips: 0,
    cardTips: 0,
  }

  // Handlers
  const handleOpenSession = async (data: { openingBalance: number; notes?: string }) => {
    if (!selectedRegister?.id) return
    await openSession({
      cashRegisterId: selectedRegister.id,
      openingBalance: data.openingBalance,
      notes: data.notes,
    })
    setIsOpenModalOpen(false)
    setSelectedRegister(null)
    fetchRegistersWithStatus()
    const sessions = await fetchActiveSessions()
    // Yeni oturum açılınca özeti güncelle
    const newSessionId = sessions?.[0]?.session?.id
    if (newSessionId) {
      fetchSessionSummary(newSessionId)
    }
  }

  const handleCloseSession = async (data: CashCloseData) => {
    const sessionId = activeSessions?.[0]?.session?.id
    if (!sessionId) return
    await closeSession(sessionId, data)
    setIsCloseModalOpen(false)
    fetchRegistersWithStatus()
    fetchActiveSessions()
    // Oturum kapandığında özet bilgisi sıfırlanır (aktif oturum yok)
  }

  const handleCreateRegister = async (data: { name: string }) => {
    await createRegister(data.name)
    setIsRegisterModalOpen(false)
    setEditingRegister(null)
  }

  const handleEditRegister = (register: { id: string; name: string }) => {
    setEditingRegister(register)
    setIsRegisterModalOpen(true)
  }

  const handleDeleteRegister = async (registerId: string) => {
    await deleteRegister(registerId)
    setIsRegisterModalOpen(false)
    setEditingRegister(null)
  }

  const handleOpenRegisterModal = () => {
    setEditingRegister(null)
    setIsRegisterModalOpen(true)
  }

  const handleCloseRegisterModal = () => {
    setIsRegisterModalOpen(false)
    setEditingRegister(null)
  }

  const handleCloseOpenModal = () => {
    setIsOpenModalOpen(false)
    setSelectedRegister(null)
  }

  const { isConnected: socketConnected } = useSocketStore()

  const handleRegisterSelect = (register: { id: string; name: string }) => {
    setSelectedRegister(register)
    setIsOpenModalOpen(true)
  }

  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])

  const summaryDate = mounted ? format(getNow(), 'dd MMMM yyyy EEEE', { locale: tr }) : ''

  return (
    <div className="flex flex-col min-h-screen bg-bg-app">
      {/* SubHeader Section */}
      <SubHeaderSection
        title="KASA YÖNETİMİ"
        description="Kasa işlemlerini yönetin ve takip edin"
        isConnected={socketConnected}
        isSyncing={isSyncing}
        moduleColor="bg-warning-main"
        actions={
          <Button
            onClick={handleOpenRegisterModal}
            variant="primary"
            className="gap-2"
          >
            <Plus size={16} />
            <span>YENİ KASA</span>
          </Button>
        }
      />

      <main className="flex flex-col flex-1 pb-6 min-h-0">
        {/* Filter & Summary Section */}
        <FilterSection className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Left Panel: Search (Standardized) */}
          <div className="relative w-[400px] max-w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              type="text"
              placeholder="KASA ADI VEYA İŞLEM ARA..."
              className="w-full pl-9 pr-4 py-2.5 text-[11px] font-black uppercase tracking-wider border border-border-light bg-bg-app rounded-sm focus:outline-none focus:border-primary-main placeholder:text-text-muted transition-all shadow-sm"
            />
          </div>

          {/* Right Panel: Stats Summary (Standardized) */}
          <div className="hidden xl:flex items-center gap-6 ml-auto px-6 border-l border-border-light">
            <div className="flex flex-col justify-center text-right border-r border-border-light pr-6">
              <p className="text-sm font-black text-orange-500 uppercase tracking-widest leading-none">
                {summaryDate}
              </p>
              <div className="flex items-center justify-end gap-1.5 mt-1.5">
                <div className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  socketConnected ? "bg-primary-main animate-pulse" : "bg-danger-main"
                )} />
                <p className="text-[9px] font-bold text-text-muted uppercase tracking-tighter">
                  Günün Özeti
                </p>
              </div>
            </div>

            {/* Net Satış */}
            <div className="text-center min-w-[100px]">
              <p className="text-sm font-black text-text-primary tabular-nums">
                {formatCurrency(currentSummary.netSales)}
              </p>
              <p className="text-[9px] font-bold text-text-muted uppercase tracking-tighter flex items-center justify-center gap-1">
                <TrendingUp size={10} className="text-success-main" />
                Net Satış
              </p>
            </div>

            {/* Toplam Bahşiş */}
            <div className="text-center min-w-[100px]">
              <p className="text-sm font-black text-text-primary tabular-nums">
                {formatCurrency(currentSummary.totalTips)}
              </p>
              <p className="text-[9px] font-bold text-text-muted uppercase tracking-tighter flex items-center justify-center gap-1">
                <Banknote size={10} className="text-primary-main" />
                Bahşiş
              </p>
            </div>

            {/* Toplam Nakit */}
            <div className="text-center min-w-[100px]">
              <p className="text-sm font-black text-warning-main tabular-nums">
                {formatCurrency(currentSummary.totalCash)}
              </p>
              <p className="text-[9px] font-bold text-text-muted uppercase tracking-tighter flex items-center justify-center gap-1">
                <Wallet size={10} />
                Nakit
              </p>
            </div>
          </div>
        </FilterSection>

        {/* Body Section: Data Area */}
        <BodySection className="overflow-y-auto space-y-6">
          {/* Active Session Notice */}
          <ActiveSessionCard
            session={currentSession}
            isOpen={isCloseModalOpen}
            onOpenClose={() => setIsCloseModalOpen(true)}
            summary={currentSummary}
          />

          {/* Registers List */}
          <RegistersList
            registers={registersWithStatus}
            currentSession={currentSession}
            onEdit={handleEditRegister}
            onSelectRegister={handleRegisterSelect}
          />
        </BodySection>
      </main>

      {/* Modals */}
      <CashOpenModal
        isOpen={isOpenModalOpen}
        onClose={handleCloseOpenModal}
        onSubmit={handleOpenSession}
        isLoading={isLoading}
      />

      <CashCloseModal
        isOpen={isCloseModalOpen}
        onClose={() => setIsCloseModalOpen(false)}
        onSubmit={handleCloseSession}
        cardTipsToday={currentSummary.cardTips}
        isLoading={isLoading}
      />

      <CashRegisterModal
        isOpen={isRegisterModalOpen}
        onClose={handleCloseRegisterModal}
        onSubmit={handleCreateRegister}
        onDelete={handleDeleteRegister}
        register={editingRegister}
        isLoading={isLoading}
      />
    </div>
  )
}
