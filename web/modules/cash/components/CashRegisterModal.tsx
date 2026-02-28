// ============================================
// CASH REGISTER MODAL COMPONENT
// Modal for creating and editing cash registers
// ============================================

'use client'

import { useState, useEffect } from 'react'
import { Wallet, X, Plus, Pencil } from 'lucide-react'
import { Button } from '@/modules/shared/components/Button'
import { Modal } from '@/modules/shared/components/Modal'

interface CashRegisterModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: { name: string }) => void
  onDelete?: (id: string) => void
  register?: {
    id: string
    name: string
  } | null
  isLoading?: boolean
}

export function CashRegisterModal({
  isOpen,
  onClose,
  onSubmit,
  onDelete,
  register,
  isLoading,
}: CashRegisterModalProps) {
  const [name, setName] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const isEditMode = !!register

  useEffect(() => {
    if (register?.name) {
      setName(register.name)
    } else {
      setName('')
    }
    setShowDeleteConfirm(false)
  }, [register, isOpen])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    onSubmit({ name: name.trim() })
  }

  const handleClose = () => {
    setName('')
    setShowDeleteConfirm(false)
    onClose()
  }

  const handleDelete = () => {
    if (register?.id && onDelete) {
      onDelete(register.id)
      handleClose()
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={isEditMode ? 'Kasa Düzenle' : 'Yeni Kasa Ekle'}>
      <div className="bg-bg-surface rounded-sm border border-border-light p-6 w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-main/10 rounded-sm flex items-center justify-center">
              {isEditMode ? (
                <Pencil className="h-5 w-5 text-primary-main" />
              ) : (
                <Plus className="h-5 w-5 text-primary-main" />
              )}
            </div>
            <div>
              <h2 className="text-lg font-bold text-text-primary">
                {isEditMode ? 'Kasa Düzenle' : 'Yeni Kasa Ekle'}
              </h2>
              <p className="text-xs text-text-muted">
                {isEditMode ? 'Kasa bilgilerini güncelleyin' : 'Sisteme yeni kasa ekleyin'}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-bg-hover rounded-sm transition-colors"
          >
            <X className="h-5 w-5 text-text-muted" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Kasa Adı */}
          <div>
            <label className="text-xs font-semibold text-text-secondary uppercase block mb-2">
              Kasa Adı
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Wallet className="h-5 w-5 text-text-muted" />
              </div>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Örn: Bar Kasa, Mutfak Kasa"
                className="w-full pl-10 pr-4 py-3 bg-bg-muted border border-border-light rounded-sm focus:outline-none focus:border-primary-main"
                required
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            {isEditMode && onDelete && (
              <Button
                type="button"
                variant="danger"
                onClick={() => setShowDeleteConfirm(true)}
                className="flex-1"
              >
                Sil
              </Button>
            )}
            <Button
              type="button"
              variant="secondary"
              onClick={handleClose}
              className="flex-1"
            >
              İptal
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={isLoading}
              className="flex-1"
            >
              {isEditMode ? 'Kaydet' : 'Ekle'}
            </Button>
          </div>

          {/* Delete Confirmation */}
          {showDeleteConfirm && (
            <div className="mt-4 p-4 bg-danger-main/10 border border-danger-main/30 rounded-sm">
              <p className="text-sm text-danger-main font-medium mb-3">
                Bu kasa kalıcı olarak silinecek. Emin misiniz?
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowDeleteConfirm(false)}
                >
                  İptal
                </Button>
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  onClick={handleDelete}
                >
                  Evet, Sil
                </Button>
              </div>
            </div>
          )}
        </form>
      </div>
    </Modal>
  )
}

export default CashRegisterModal
