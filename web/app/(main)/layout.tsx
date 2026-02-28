'use client'

import React from 'react'
import { MainHeader, MainFooter, Sidebar } from '@/modules/shared/components'
import { UIProvider } from '@/modules/shared/context/UIContext'

export default function MainLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <UIProvider>
            <div className="flex flex-col min-h-screen relative overflow-hidden bg-background">
                {/* Sidebar Overlay Content */}
                <Sidebar />

                {/* Header */}
                <MainHeader />

                {/* Main Content Area */}
                <div className="flex flex-1 pt-16 overflow-hidden">
                    {/* Spacer for Sidebar on Desktop (Matches Header Hamburger Area) */}
                    <div className="hidden md:block w-20 shrink-0 border-r border-border-light/50 bg-bg-surface/50 h-full" />
                    
                    <main className="flex-1 min-w-0 px-4 md:px-8 w-full flex flex-col overflow-hidden">
                        {children}
                    </main>
                </div>

                {/* Footer */}
                <MainFooter />

                {/* Background decoration (Refined Deep Glows) */}
                <div className="fixed top-[-10%] left-[-10%] w-[60%] h-[60%] bg-orange-600/[0.03] rounded-full blur-[180px] pointer-events-none -z-10" />
                <div className="fixed bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-cyan-600/[0.02] rounded-full blur-[150px] pointer-events-none -z-10" />
            </div>
        </UIProvider>
    )
}
