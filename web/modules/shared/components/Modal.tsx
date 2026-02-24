'use client'

import React, { useEffect } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/modules/shared/utils/cn'

interface ModalProps {
    isOpen: boolean
    onClose: () => void
    title: string
    children: React.ReactNode
    className?: string
    maxWidth?: string
}

export const Modal: React.FC<ModalProps> = ({
    isOpen,
    onClose,
    title,
    children,
    className,
    maxWidth = 'max-w-lg'
}) => {
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = 'unset'
        }
        return () => {
            document.body.style.overflow = 'unset'
        }
    }, [isOpen])

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop - Strict neutral overlay */}
            <div
                className="absolute inset-0 bg-text-primary/40 transition-opacity animate-in fade-in duration-200"
                onClick={onClose}
            />

            {/* Content Area - ERP Style (Flat surface, solid borders) */}
            <div className={cn(
                "relative w-full bg-bg-surface border border-border-light rounded-sm shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200",
                maxWidth,
                className
            )}>
                {/* Header - Clear separation */}
                <div className="relative flex items-center justify-between px-6 py-4 border-b border-border-light bg-bg-muted/10">
                    <h2 className="text-sm font-black text-text-primary uppercase tracking-widest">{title}</h2>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-sm transition-all hover:bg-bg-hover text-text-muted hover:text-text-primary border border-transparent hover:border-border-light"
                        aria-label="Kapat"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="relative p-6 max-h-[calc(90vh-100px)] overflow-y-auto scrollbar-style bg-bg-surface">
                    {children}
                </div>
            </div>
        </div>
    )
}
