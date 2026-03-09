'use client'

import React, { useState } from 'react'
import { LayoutGrid, LogOut, Settings, Package, Users, BookOpen, Wallet, Calendar, ShieldCheck, Grid2X2, ClipboardList, Bell, BarChart3, CreditCard } from 'lucide-react'
import { authService } from '@/modules/auth/services/auth.service'
import { useUI } from '@/modules/shared/context/UIContext'
import { cn } from '../utils/cn'
import { usePathname } from 'next/navigation'
import Link from 'next/link'

export function Sidebar() {
    const { isSidebarOpen, closeSidebar } = useUI()
    const pathname = usePathname()
    const [isHovered, setIsHovered] = useState(false)
    const isExpanded = isSidebarOpen || isHovered

    const MENU_ITEMS = [
        { icon: LayoutGrid, label: 'Kontrol Paneli', href: '/dashboard' },
        { icon: Grid2X2, label: 'Masa Yönetimi', href: '/tables' },
        { icon: ClipboardList, label: 'Siparişler', href: '/orders' },
        { icon: Wallet, label: 'Kasa', href: '/cash' },
        { icon: CreditCard, label: 'Ödemeler', href: '/payments' },
        { icon: BarChart3, label: 'Raporlar', href: '/reports' },
        { icon: BookOpen, label: 'Ürün Kataloğu', href: '/products' },
        { icon: Package, label: 'Stok ve Envanter', href: '/inventory' },
        { icon: Calendar, label: 'Rezervasyonlar', href: '/reservations' },
        { icon: Users, label: 'Müşteriler', href: '/customers' },
        { icon: Bell, label: 'Bildirimler', href: '/notifications' },
        { icon: Settings, label: 'Sistem Ayarları', href: '/settings' },
    ]


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
                    <div className="space-y-1">
                        {MENU_ITEMS.map((item) => {
                            const isActive = pathname === item.href
                            const Icon = item.icon

                            return (
                                <Link
                                    key={item.label}
                                    href={item.href}
                                    className={cn(
                                        "flex items-center h-12 transition-all relative group overflow-hidden",
                                        isActive
                                            ? "text-primary-main bg-bg-app"
                                            : "text-text-secondary hover:text-text-primary hover:bg-bg-app/50"
                                    )}
                                >
                                    {/* Active Indicator */}
                                    {isActive && (
                                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary-main rounded-r-full" />
                                    )}

                                    {/* Icon Container - Fixed position */}
                                    <div className="w-20 shrink-0 flex items-center justify-center">
                                        <Icon
                                            size={20}
                                            className={cn("transition-colors", isActive ? "text-primary-main" : "text-text-secondary")}
                                        />
                                    </div>

                                    {/* Text Content - Animated appearance */}
                                    <div className={cn(
                                        "flex items-center transition-all duration-300 ease-in-out whitespace-nowrap",
                                        isExpanded ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4 pointer-events-none"
                                    )}>
                                        <span className="text-xs font-black uppercase tracking-wider">
                                            {item.label}
                                        </span>
                                    </div>

                                    {/* Tooltip for collapsed mode */}
                                    {!isExpanded && (
                                        <div className="absolute left-full ml-2 px-3 py-2 bg-text-primary text-white text-[10px] font-black uppercase tracking-widest rounded-sm opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-[100] shadow-xl">
                                            {item.label}
                                            <div className="absolute top-1/2 -left-1 -translate-y-1/2 w-2 h-2 bg-text-primary rotate-45" />
                                        </div>
                                    )}
                                </Link>
                            )
                        })}
                    </div>
                </nav>

                {/* Footer Section */}
                <div className="mt-auto border-t border-border-light/50 bg-bg-app/20">
                    <div className="py-4">
                        {isExpanded ? (
                            <div className="px-5 mb-2 animate-in fade-in slide-in-from-bottom-1 duration-200">
                                <div className="flex items-center gap-3 px-3 py-2.5 bg-success-bg/10 border border-success-border/20 rounded-sm">
                                    <ShieldCheck size={16} className="text-success-main" />
                                    <div className="flex flex-col">
                                        <span className="text-[8px] font-black text-success-main uppercase tracking-widest">Sistem Güvenli</span>
                                        <span className="text-[7px] font-bold text-text-muted uppercase tracking-widest">{process.env.NEXT_PUBLIC_APP_VERSION}</span>
                                    </div>
                                </div>
                            </div>
                        ) : null}

                        {/* Logout Button - Combined logic */}
                        <button
                            type="button"
                            onClick={() => {
                                closeSidebar()
                                authService.logout()
                            }}
                            className="flex items-center h-12 w-full transition-all relative group overflow-hidden text-danger-main hover:bg-danger-main/5"
                        >
                            <div className="w-20 shrink-0 flex items-center justify-center">
                                <LogOut size={20} />
                            </div>

                            <div className={cn(
                                "flex items-center transition-all duration-300 whitespace-nowrap",
                                isExpanded ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4 pointer-events-none"
                            )}>
                                <span className="text-[10px] font-black uppercase tracking-[0.2em]">Çıkış Yap</span>
                            </div>

                            {!isExpanded && (
                                <div className="absolute left-full ml-2 px-3 py-2 bg-text-primary text-white text-[10px] font-black uppercase tracking-widest rounded-sm opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-[100] shadow-xl">
                                    Çıkış Yap
                                    <div className="absolute top-1/2 -left-1 -translate-y-1/2 w-2 h-2 bg-text-primary rotate-45" />
                                </div>
                            )}
                        </button>
                    </div>
                </div>
            </aside>
        </>
    )
}
