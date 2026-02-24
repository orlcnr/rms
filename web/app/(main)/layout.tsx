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
                <main className="flex-1 pt-24 sm:pt-28 pb-32 px-4 sm:px-8 lg:px-12 w-full space-y-6 sm:space-y-8 overflow-y-auto scrollbar-hide">
                    {children}
                </main>

                {/* Footer */}
                <MainFooter />

                {/* Background decoration (Refined Deep Glows) */}
                <div className="fixed top-[-10%] left-[-10%] w-[60%] h-[60%] bg-orange-600/[0.03] rounded-full blur-[180px] pointer-events-none -z-10" />
                <div className="fixed bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-cyan-600/[0.02] rounded-full blur-[150px] pointer-events-none -z-10" />
            </div>
        </UIProvider>
    )
}
