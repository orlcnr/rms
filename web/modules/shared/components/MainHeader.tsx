'use client'

import React from 'react'
import { Menu, UtensilsCrossed, Bell, User, ChevronDown } from 'lucide-react'
import { useUI } from '@/modules/shared/context/UIContext'

export function MainHeader() {
    const { toggleSidebar } = useUI()

    return (
        <header className="fixed top-0 left-0 right-0 z-[90] bg-bg-surface border-b border-border-light h-16 flex items-center justify-between shadow-sm">
            {/* Left Section: Menu & Logo Alignment */}
            <div className="flex items-center h-full">
                {/* Hamburger Area - Matches narrow sidebar width */}
                <div className="w-20 flex items-center justify-center border-r border-border-light/50 h-full">
                    <button
                        onClick={toggleSidebar}
                        className="p-2.5 hover:bg-bg-app text-text-muted hover:text-primary-main transition-all rounded-sm border border-transparent hover:border-border-light focus-visible:ring-2 focus-visible:ring-primary-main focus-visible:outline-none"
                        aria-label="Ana Menüyü Aç"
                    >
                        <Menu size={24} />
                    </button>
                </div>

                {/* Brand Area - This is where the left alignment axis starts */}
                <div className="flex items-center gap-3 px-8">
                    <div className="w-9 h-9 bg-primary-main rounded-sm flex items-center justify-center shadow-sm">
                        <UtensilsCrossed size={18} className="text-text-inverse" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-sm font-black text-text-primary uppercase tracking-tight leading-none">
                            POSMENUM - RMS
                        </span>
                        <span className="text-[8px] font-black text-primary-main uppercase tracking-widest mt-1">
                            RESTAURANT MANAGEMENT SYSTEM
                        </span>
                    </div>
                </div>
            </div>

            {/* Right Section: System Status & User Profile */}
            <div className="flex items-center gap-4 px-6">
                {/* System Alerts */}
                <button className="relative p-2.5 hover:bg-bg-app text-text-muted hover:text-text-primary transition-all rounded-sm border border-transparent hover:border-border-light focus-visible:ring-2 focus-visible:ring-primary-main focus-visible:outline-none" aria-label="Bildirimler">
                    <Bell size={18} />
                    <span className="absolute top-1 right-1 bg-danger-main text-text-inverse text-xs font-semibold w-4 h-4 flex items-center justify-center rounded-full border-2 border-bg-surface">
                        3
                    </span>
                </button>

                <div className="h-8 w-px bg-border-light" />

                {/* User Context - ERP Structure */}
                <div className="flex items-center gap-3 cursor-pointer group">
                    <div className="hidden md:flex flex-col text-right">
                        <span className="text-sm font-semibold text-text-primary leading-none">John Doe</span>
                        <span className="text-xs font-medium text-primary-main mt-1">Sistem Yöneticisi</span>
                    </div>

                    {/* User Avatar with Dropdown */}
                    <div className="flex items-center gap-2 bg-bg-app p-1 pr-3 rounded-sm border border-border-light group-hover:border-primary-main transition-all">
                        <div className="w-9 h-9 rounded-sm bg-bg-surface flex items-center justify-center border border-border-light overflow-hidden">
                            <User size={18} className="text-text-muted group-hover:text-primary-main transition-colors" />
                        </div>
                        <ChevronDown size={14} className="text-text-muted group-hover:text-primary-main transition-colors" />
                    </div>
                </div>
            </div>
        </header>
    )
}
