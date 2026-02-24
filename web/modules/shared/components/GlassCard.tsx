import { cn } from '@/modules/shared/utils/cn'
import React from 'react'

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode
    hoverEffect?: boolean
}

export function GlassCard({ className, children, hoverEffect = false, ...props }: GlassCardProps) {
    return (
        <div
            className={cn(
                'glass-panel relative rounded-3xl p-6 transition-all duration-500 ease-out overflow-hidden',
                hoverEffect && 'hover:scale-[1.01] hover:shadow-orange-500/10 cursor-default',
                className
            )}
            {...props}
        >
            {/* Shine effect overlay */}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-30" />

            {/* Content */}
            <div className="relative z-10">
                {children}
            </div>
        </div>
    )
}
