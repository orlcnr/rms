'use client'

import React, { useEffect } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/modules/shared/utils/cn'

interface DrawerProps {
    isOpen: boolean
    onClose: () => void
    title?: string
    children: React.ReactNode
    className?: string
    showCloseButton?: boolean
}

/**
 * Drawer - Bottom Sheet Component
 * Mobile-first design, slides up from bottom
 */
export const Drawer: React.FC<DrawerProps> = ({
    isOpen,
    onClose,
    title,
    children,
    className,
    showCloseButton = true,
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
        <div className="fixed inset-0 z-[100] flex items-end justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-text-primary/40 transition-opacity animate-in fade-in duration-200"
                onClick={onClose}
            />

            {/* Drawer Content - Slides up from bottom */}
            <div className={cn(
                "relative w-full max-w-lg bg-bg-surface border-t border-l border-r border-border-light rounded-t-2xl shadow-xl overflow-hidden animate-in slide-in-from-bottom duration-300",
                "max-h-[85vh] flex flex-col",
                className
            )}>
                {/* Header */}
                {(title || showCloseButton) && (
                    <div className="relative flex items-center justify-between px-6 py-4 border-b border-border-light">
                        {title && (
                            <h2 className="text-base font-black text-text-primary uppercase tracking-wide">
                                {title}
                            </h2>
                        )}
                        {showCloseButton && (
                            <button
                                onClick={onClose}
                                className="p-2 rounded-full transition-all hover:bg-bg-hover text-text-muted hover:text-text-primary ml-auto"
                                aria-label="Kapat"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        )}
                    </div>
                )}

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4">
                    {children}
                </div>
            </div>
        </div>
    )
}
