// ============================================
// CASH MODULE - CLIENT COMPONENT
// ============================================

'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Search, Wallet, History } from 'lucide-react'
import { useCash } from '@/modules/cash/hooks/useCash'
import {
  CashOpenModal,
  CashCloseModal,
  CashRegisterModal,
} from '@/modules/cash/components'
import { CashRegisterWithStatus, ActiveSessionWrapper, CashCloseData } from '@/modules/cash/types'
import { ActiveSessionCard } from './ActiveSessionCard'
import { RegistersList } from './RegistersList'
import { SubHeaderSection, FilterSection, BodySection } from '@/modules/shared/components/layout'
import { Button } from '@/modules/shared/components/Button'
import { useSocketStore } from '@/modules/shared/api/socket'
import { cn } from '@/modules/shared/utils/cn'
import { format } from 'date-fns'
import { tr } from 'date-fns/locale'
import { getNow } from '@/modules/shared/utils/date'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

interface CashClientProps {
  restaurantId: string
  initialRegisters: CashRegisterWithStatus[]
  initialSessions: ActiveSessionWrapper[]
}

export default function CashClient({
  restaurantId,
  initialRegisters,
  initialSessions,
}: CashClientProps) {
  const router = useRouter()
  // State from hook
  const {
    registersWithStatus,
    activeSessions,
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
  })

  // Modal states
  const [selectedRegister, setSelectedRegister] = useState<{ id: string; name: string } | null>(null)
  const [selectedSession, setSelectedSession] = useState<{ id: string; name: string } | null>(null)
  const [selectedSessionCardTips, setSelectedSessionCardTips] = useState(0)
  const [isOpenModalOpen, setIsOpenModalOpen] = useState(false)
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false)
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false)
  const [editingRegister, setEditingRegister] = useState<{ id: string; name: string } | null>(null)

  // Handlers
  const handleOpenSession = async (data: { openingBalance: number; notes?: string }) => {
    if (!selectedRegister?.id) return
    try {
      await openSession({
        cashRegisterId: selectedRegister.id,
        openingBalance: data.openingBalance,
        notes: data.notes,
      })
      setIsOpenModalOpen(false)
      setSelectedRegister(null)
      await fetchRegistersWithStatus()
      await fetchActiveSessions()
    } catch (error: any) {
      if (!error?.response?.data?.message) {
        toast.error('Kasa oturumu açılırken beklenmeyen bir hata oluştu')
      }
    }
  }

  const handleCloseSession = async (data: CashCloseData) => {
    const sessionId = selectedSession?.id
    if (!sessionId) return
    try {
      await closeSession(sessionId, data)
      setIsCloseModalOpen(false)
      setSelectedSession(null)
      setSelectedSessionCardTips(0)
      await fetchRegistersWithStatus()
      await fetchActiveSessions()
    } catch (error: any) {
      if (!error?.response?.data?.message) {
        toast.error('Kasa oturumu kapatılırken beklenmeyen bir hata oluştu')
      }
    }
  }

  const handleCreateRegister = async (data: { name: string }) => {
    try {
      await createRegister(data.name)
      setIsRegisterModalOpen(false)
      setEditingRegister(null)
    } catch (error: any) {
      if (!error?.response?.data?.message) {
        toast.error('Kasa oluşturulurken beklenmeyen bir hata oluştu')
      }
    }
  }

  const handleEditRegister = (register: { id: string; name: string }) => {
    setEditingRegister(register)
    setIsRegisterModalOpen(true)
  }

  const handleDeleteRegister = async (registerId: string) => {
    try {
      await deleteRegister(registerId)
      setIsRegisterModalOpen(false)
      setEditingRegister(null)
    } catch (error: any) {
      if (!error?.response?.data?.message) {
        toast.error('Kasa silinirken beklenmeyen bir hata oluştu')
      }
    }
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

  const handleCloseCloseModal = () => {
    setIsCloseModalOpen(false)
    setSelectedSession(null)
    setSelectedSessionCardTips(0)
  }

  const { isConnected: socketConnected } = useSocketStore()

  const handleRegisterSelect = (register: { id: string; name: string }) => {
    setSelectedRegister(register)
    setIsOpenModalOpen(true)
  }

  const handleSessionSelect = async (session: { id: string; name: string }) => {
    setSelectedSession(session)
    try {
      const sessionSummary = await fetchSessionSummary(session.id)
      setSelectedSessionCardTips(sessionSummary?.cardTips || 0)
      setIsCloseModalOpen(true)
    } catch (error: any) {
      setSelectedSession(null)
      setSelectedSessionCardTips(0)
      console.error('[CashClient] Session summary fetch failed:', error)
      if (!error?.response?.data?.message) {
        toast.error('Kasa özeti alınamadı')
      }
    }
  }

  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])

  const refreshCashData = useCallback(async () => {
    try {
      await fetchRegistersWithStatus()
      await fetchActiveSessions()
    } catch (error) {
      // Silent refresh: do not interrupt user with toast noise.
      console.error('[CashClient] Silent refresh failed:', error)
    }
  }, [fetchActiveSessions, fetchRegistersWithStatus])

  // Ensure fresh data when entering cash page and when tab regains focus.
  useEffect(() => {
    if (!mounted) return

    void refreshCashData()

    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        void refreshCashData()
      }
    }

    window.addEventListener('focus', handleVisibilityOrFocus)
    document.addEventListener('visibilitychange', handleVisibilityOrFocus)

    return () => {
      window.removeEventListener('focus', handleVisibilityOrFocus)
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus)
    }
  }, [mounted, refreshCashData])

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
          <div className="flex gap-2">
            <Button
              onClick={() => router.push("/cash/history")}
              variant="outline"
              className="gap-2"
            >
              <History size={16} />
              <span>KASA GEÇMİŞİ</span>
            </Button>
            <Button
              onClick={handleOpenRegisterModal}
              variant="primary"
              className="gap-2"
            >
              <Plus size={16} />
              <span>YENİ KASA</span>
            </Button>
          </div>
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
                  Aktif Kasa Durumu
                </p>
              </div>
            </div>

            {/* Açık Oturum Sayısı */}
            <div className="text-center min-w-[100px]">
              <p className="text-sm font-black text-text-primary">
                {activeSessions.length}
              </p>
              <p className="text-[9px] font-bold text-text-muted uppercase tracking-tighter flex items-center justify-center gap-1">
                Açık Oturum
              </p>
            </div>

            {/* Açık Kasa Sayısı */}
            <div className="text-center min-w-[100px]">
              <p className="text-sm font-black text-text-primary">
                {registersWithStatus.filter((register) => register.status === 'open').length}
              </p>
              <p className="text-[9px] font-bold text-text-muted uppercase tracking-tighter flex items-center justify-center gap-1">
                Açık Kasa
              </p>
            </div>

            {/* Kapalı Kasa Sayısı */}
            <div className="text-center min-w-[100px]">
              <p className="text-sm font-black text-warning-main">
                {registersWithStatus.filter((register) => register.status === 'closed').length}
              </p>
              <p className="text-[9px] font-bold text-text-muted uppercase tracking-tighter flex items-center justify-center gap-1">
                <Wallet size={10} className="text-warning-main" />
                Kapalı Kasa
              </p>
            </div>
          </div>
        </FilterSection>

        {/* Body Section: Data Area */}
        <BodySection className="overflow-y-auto space-y-6">
          {/* Active Session Notice */}
          <ActiveSessionCard
            activeSessionCount={activeSessions.length}
          />

          {/* Registers List */}
          <RegistersList
            registers={registersWithStatus}
            onEdit={handleEditRegister}
            onSelectRegister={handleRegisterSelect}
            onSelectSessionToClose={handleSessionSelect}
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
        onClose={handleCloseCloseModal}
        onSubmit={handleCloseSession}
        cardTipsToday={selectedSessionCardTips}
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
