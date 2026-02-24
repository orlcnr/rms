'use client'

import React, { useState, useEffect } from 'react'
import { Activity } from 'lucide-react'

export function DashboardFooter() {
    const [lastSync, setLastSync] = useState<string>('--:--')

    useEffect(() => {
        // Only set the time on client side to avoid hydration mismatch
        const now = new Date()
        setLastSync(`${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`)
        
        // Update every minute
        const interval = setInterval(() => {
            const now = new Date()
            setLastSync(`${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`)
        }, 60000)
        
        return () => clearInterval(interval)
    }, [])

    return (
        <footer className="mt-6 pt-4 border-t border-border-light">
            <div className="flex justify-between items-center">
                {/* Left: Version info */}
                <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">
                        v1.0.0
                    </span>
                    <span className="text-xs text-text-muted">•</span>
                    <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                        RESTAU-RMS
                    </span>
                </div>

                {/* Right: System status + Last sync */}
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <Activity size={14} className="text-success-main" />
                        <span className="text-xs font-semibold text-success-main uppercase tracking-wider">
                            SİSTEM ÇEVRİMİÇİ
                        </span>
                    </div>
                    <span className="text-xs text-text-muted">|</span>
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">
                            Son sync:
                        </span>
                        <span className="text-xs font-semibold text-text-secondary tabular-nums">
                            {lastSync}
                        </span>
                    </div>
                </div>
            </div>
        </footer>
    )
}
