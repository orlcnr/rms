// ============================================
// REGISTERS LIST COMPONENT
// ============================================

import { Plus, Pencil, Wallet } from 'lucide-react'
import { Button } from '@/modules/shared/components/Button'
import type { CashRegisterWithStatus, ActiveSessionWrapper } from '@/modules/cash/types'

interface RegistersListProps {
  registers: CashRegisterWithStatus[] | null
  currentSession: ActiveSessionWrapper | null
  onEdit: (register: { id: string; name: string }) => void
  onSelectRegister: (register: { id: string; name: string }) => void
}

export function RegistersList({
  registers,
  currentSession,
  onEdit,
  onSelectRegister,
}: RegistersListProps) {
  return (
    <div className="bg-bg-surface border border-border-light rounded-sm">
      <div className="p-4 border-b border-border-light">
        <h2 className="text-sm font-semibold text-text-primary uppercase">Kasalar</h2>
      </div>
      <div className="divide-y divide-border-light">
        {registers && registers.length > 0 ? (
          registers.map((item) => (
            <div
              key={item?.id}
              className="p-4 flex items-center justify-between hover:bg-bg-muted/30"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-bg-muted rounded-sm flex items-center justify-center">
                  <Wallet className="h-5 w-5 text-text-secondary" />
                </div>
                <div>
                  <p className="text-[11px] font-black text-text-primary uppercase tracking-wider">
                    {item?.name || 'İSİMSİZ KASA'}
                  </p>
                  <p className="text-xs text-text-muted">
                    {item?.status === 'open' ? (
                      <span className="text-success-main">Açık Oturum</span>
                    ) : (
                      <span>Oturum Yok</span>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {/* Edit Button */}
                <button
                  onClick={() =>
                    onEdit({
                      id: item.id,
                      name: item.name || 'İSİMSİZ KASA',
                    })
                  }
                  className="p-2 hover:bg-bg-hover rounded-sm transition-colors"
                  title="Düzenle"
                >
                  <Pencil className="h-4 w-4 text-text-muted" />
                </button>
                {/* Open Session Button */}
                {item?.status === 'closed' && !currentSession && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() =>
                      onSelectRegister({
                        id: item.id,
                        name: item.name,
                      })
                    }
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Oturum Aç
                  </Button>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="p-8 text-center text-text-muted">
            <Wallet className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Kayıtlı kasa bulunmuyor</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default RegistersList
