'use client'

import React, { useState } from 'react'
import { LayoutGrid, Receipt, QrCode, LogOut, Settings, Package, Users, UtensilsCrossed, Activity, BookOpen, Wallet, Calendar, ShieldCheck, X, Menu } from 'lucide-react'
import { useUI } from '@/modules/shared/context/UIContext'
import { cn } from '../utils/cn'
import { usePathname } from 'next/navigation'

const MENU_ITEMS = [
    { icon: LayoutGrid, label: 'DASHBOARD', href: '/dashboard' },
    { icon: QrCode, label: 'MASA YÖNETİMİ', href: '/tables' },
    { icon: Receipt, label: 'SİPARİŞLER', href: '/orders' },
    { icon: Wallet, label: 'KASA', href: '/cash' },
    { icon: BookOpen, label: 'ÜRÜN KATALOĞU', href: '/products' },
    { icon: Package, label: 'STOK VE ENVANTER', href: '/inventory' },
    { icon: Calendar, label: 'REZERVASYONLAR', href: '/reservations' },
    { icon: Users, label: 'MÜŞTERİ VERİTABANI', href: '/customers' },
    { icon: Settings, label: 'SİSTEM AYARLARI', href: '/settings' },
]

export function Sidebar() {
    const { isSidebarOpen, toggleSidebar, closeSidebar } = useUI()
    const pathname = usePathname()
    const [isHovered, setIsHovered] = useState(false)

    // Sidebar state: Desktop stays as iconizer (w-20), expands on hover or via toggle.
    // Mobile stays hidden and opens as full drawer.

    return (
        <>
            {/* Backdrop for Mobile */}
            <div
                className={cn(
                    "fixed inset-0 z-[60] bg-text-primary/20 backdrop-blur-[1px] transition-opacity duration-300 md:hidden",
                    isSidebarOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
                )}
                onClick={closeSidebar}
            />

            {/* Sidebar Panel */}
            <aside
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                className={cn(
                    "fixed top-16 left-0 bottom-0 z-[70] bg-bg-surface border-r border-border-light transition-all duration-300 ease-in-out flex flex-col",
                    // Width logic
                    isSidebarOpen || isHovered ? "w-72" : "w-0 md:w-20",
                    // Mobile visibility
                    !isSidebarOpen && "translate-x-[-100%] md:translate-x-0"
                )}
            >
                {/* Navigation */}
                <nav className="flex-1 py-6 overflow-y-auto custom-scrollbar overflow-x-hidden">
                    {(isSidebarOpen || isHovered) && (
                        <div className="px-6 mb-4 animate-in fade-in duration-300">
                            <span className="text-[9px] font-medium text-text-muted uppercase tracking-[0.2em] opacity-50">ANA MENÜ</span>
                        </div>
                    )}
                    <div className="space-y-1">
                        {MENU_ITEMS.map((item) => {
                            const isActive = pathname === item.href
                            const Icon = item.icon
                            return (
                                <a
                                    key={item.label}
                                    href={item.href}
                                    className={cn(
                                        "flex items-center transition-all relative group h-12",
                                        isSidebarOpen || isHovered ? "px-6 gap-3" : "justify-center px-0",
                                        isActive
                                            ? "text-primary-main font-bold bg-bg-app border-l-4 border-primary-main"
                                            : "text-text-secondary font-medium hover:text-text-primary hover:bg-bg-app/50 border-l-4 border-transparent"
                                    )}
                                >
                                    <Icon
                                        size={20}
                                        className={cn("shrink-0 transition-colors", isActive ? "text-primary-main" : "text-text-secondary")}
                                    />
                                    {(isSidebarOpen || isHovered) ? (
                                        <span className="text-xs font-black uppercase tracking-wider animate-in slide-in-from-left-2 duration-300">
                                            {item.label}
                                        </span>
                                    ) : (
                                        // Tooltip for collapsed mode
                                        <div className="absolute left-full ml-2 px-3 py-2 bg-text-primary text-white text-[10px] font-black uppercase tracking-widest rounded-sm opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-[100] shadow-xl">
                                            {item.label}
                                            <div className="absolute top-1/2 -left-1 -translate-y-1/2 w-2 h-2 bg-text-primary rotate-45" />
                                        </div>
                                    )}
                                </a>
                            )
                        })}
                    </div>
                </nav>

                {/* Footer */}
                <div className={cn(
                    "p-4 border-t border-border-light/50 bg-bg-app/20 transition-all duration-300",
                    isSidebarOpen || isHovered ? "opacity-100" : "opacity-0 md:opacity-100"
                )}>
                    {(isSidebarOpen || isHovered) ? (
                        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <div className="flex items-center gap-3 mb-4 px-2 py-3 bg-success-bg/10 border border-success-border/20 rounded-sm">
                                <ShieldCheck size={16} className="text-success-main" />
                                <div className="flex flex-col">
                                    <span className="text-[8px] font-black text-success-main uppercase tracking-widest">SİSTEM GÜVENLİ</span>
                                    <span className="text-[7px] font-bold text-text-muted uppercase tracking-widest">v2.4.0-STABLE</span>
                                </div>
                            </div>
                            <button className="flex items-center gap-3 px-4 py-3 w-full rounded-sm text-[10px] font-black uppercase tracking-[0.2em] text-danger-main bg-danger-main/5 hover:bg-danger-subtle border border-danger-main/10 hover:border-danger-main/30 transition-all active:scale-95">
                                <LogOut size={16} />
                                <span>ÇIKIŞ YAP</span>
                            </button>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center gap-4 py-2">
                             <button className="p-2 text-danger-main hover:bg-danger-main/10 rounded-sm transition-colors group relative">
                                <LogOut size={20} />
                                <div className="absolute left-full ml-4 px-3 py-2 bg-text-primary text-white text-[10px] font-black uppercase tracking-widest rounded-sm opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-[100]">
                                    ÇIKIŞ YAP
                                </div>
                             </button>
                        </div>
                    )}
                </div>
            </aside>
        </>
    )
}
