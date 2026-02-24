'use client'

import { MoreVertical, QrCode, Trash2 } from 'lucide-react'
import { Button } from '@/modules/shared/components/Button'

interface TableActionsProps {
    onEdit: () => void
    onDelete: () => void
    onShowQr: () => void
}

export function TableActions({ onEdit, onDelete, onShowQr }: TableActionsProps) {
    return (
        <div className="flex items-center gap-1">
            <Button 
                variant="ghost" 
                size="sm"
                onClick={onShowQr} 
                title="QR Kod"
                className="p-2"
            >
                <QrCode size={16} />
            </Button>
            <Button 
                variant="ghost" 
                size="sm"
                onClick={onEdit} 
                title="Düzenle"
                className="p-2"
            >
                <MoreVertical size={16} />
            </Button>
            <Button 
                variant="ghost" 
                size="sm"
                onClick={onDelete} 
                title="Sil"
                className="p-2 text-text-muted hover:text-danger-main"
            >
                <Trash2 size={16} />
            </Button>
        </div>
    )
}
