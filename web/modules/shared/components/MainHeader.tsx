'use client'

import React from 'react'
import { Menu, UtensilsCrossed, Bell, User, ChevronDown } from 'lucide-react'
import { useUI } from '@/modules/shared/context/UIContext'

export function MainHeader() {
    const { toggleSidebar } = useUI()

    return (
        <header className="fixed top-0 left-0 right-0 z-50 bg-bg-surface border-b border-border-light h-16 flex items-center justify-between px-6 lg:px-8 shadow-sm">
            {/* Left Section: Logo & Menu */}
            <div className="flex items-center gap-6">
                <button
                    onClick={toggleSidebar}
                    className="p-2 hover:bg-bg-app text-text-muted hover:text-primary-main transition-all rounded-sm border border-transparent hover:border-border-light focus-visible:ring-2 focus-visible:ring-primary-main focus-visible:outline-none"
                    aria-label="Ana Menüyü Aç"
                >
                    <Menu size={20} />
                </button>

                <div className="h-8 w-px bg-border-light hidden md:block" />

                {/* Logo - Restaurant Name */}
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-primary-main rounded-sm flex items-center justify-center">
                        <UtensilsCrossed size={16} className="text-text-inverse" />
                    </div>
                    <span className="text-sm font-semibold text-text-primary uppercase tracking-[0.1em] hidden lg:block">
                        RESTAU-RMS
                    </span>
                </div>
            </div>

            {/* Right Section: System Status & User Profile */}
            <div className="flex items-center gap-4">
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
                    {/* User Info - Vertical alignment with different font weights */}
                    <div className="hidden md:flex flex-col">
                        <span className="text-sm font-semibold text-text-primary leading-none">John Doe</span>
                        <span className="text-xs font-medium text-primary-main mt-1">Sistem Yöneticisi</span>
                    </div>

                    {/* User Avatar with Dropdown */}
                    <div className="flex items-center gap-2 bg-bg-app p-1 pr-3 rounded-sm border border-border-light group-hover:border-primary-main transition-all focus-within:border-primary-main focus-within:ring-2 focus-within:ring-primary-main">
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
