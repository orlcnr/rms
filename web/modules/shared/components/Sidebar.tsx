'use client'

import React from 'react'
import { X, LayoutGrid, Receipt, QrCode, LogOut, Settings, Package, Users, UtensilsCrossed, Activity, ShieldCheck, BookOpen } from 'lucide-react'
import { useUI } from '@/modules/shared/context/UIContext'
import { cn } from '../utils/cn'
import { usePathname, useRouter } from 'next/navigation'

const MENU_ITEMS = [
    { icon: LayoutGrid, label: 'DASHBOARD', href: '/dashboard' },
    { icon: Activity, label: 'OPERASYONLAR', href: '/operations' },
    { icon: Receipt, label: 'SİPARİŞLER', href: '/orders' },
    { icon: QrCode, label: 'MASA YÖNETİMİ', href: '/tables' },
    { icon: Package, label: 'STOK VE ENVANTER', href: '/inventory' },
    { icon: BookOpen, label: 'ÜRÜN KATALOĞU', href: '/products' },
    { icon: Users, label: 'MÜŞTERİ VERİTABANI', href: '/customers' },
    { icon: Settings, label: 'SİSTEM AYARLARI', href: '/settings' },
]

export function Sidebar() {
    const { isSidebarOpen, closeSidebar } = useUI()
    const pathname = usePathname()
    const router = useRouter()

    return (
        <>
            {/* Backdrop - High contrast neutral overlay */}
            <div
                className={cn(
                    "fixed inset-0 z-[60] bg-text-primary/20 backdrop-blur-[1px] transition-opacity duration-300 pointer-events-none",
                    isSidebarOpen ? "opacity-100 pointer-events-auto" : "opacity-0"
                )}
                onClick={closeSidebar}
            />

            {/* Sidebar Panel - Flat surface, crisp borders */}
            <aside
                className={cn(
                    "fixed top-0 left-0 bottom-0 z-[70] w-72 bg-bg-surface border-r border-border-light transition-transform duration-300 ease-in-out shadow-sm lg:shadow-none",
                    isSidebarOpen ? "translate-x-0" : "-translate-x-full"
                )}
            >
                <div className="flex flex-col h-full">
                    {/* Brand Header - Clean & Professional */}
                    <div className="flex items-center justify-between px-6 py-8 border-b border-border-light/50 bg-bg-app/30">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-primary-main rounded-sm flex items-center justify-center shadow-sm">
                                <UtensilsCrossed size={20} className="text-text-inverse" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-sm font-black text-text-primary uppercase tracking-tight leading-none">RMS ENTERPRISE</span>
                                <span className="text-[9px] font-black text-primary-main uppercase tracking-widest mt-1">SİSTEM KONTROL</span>
                            </div>
                        </div>
                        <button
                            onClick={closeSidebar}
                            className="p-1.5 hover:bg-bg-hover rounded-sm text-text-muted hover:text-text-primary transition-colors lg:hidden"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Navigation - High Density ERP Pattern */}
                    <nav className="flex-1 py-6 overflow-y-auto custom-scrollbar">
                        <div className="px-6 mb-4">
                            <span className="text-[9px] font-medium text-text-muted uppercase tracking-[0.2em] opacity-50">ANA MENÜ</span>
                        </div>
                        <div className="space-y-0.5">
                            {MENU_ITEMS.map((item) => {
                                const isActive = pathname === item.href
                                return (
                                    <a
                                        key={item.label}
                                        href={item.href}
                                        className={cn(
                                            "flex items-center gap-3 px-6 py-3.5 transition-all relative",
                                            isActive
                                                ? "text-primary-main font-bold bg-bg-app border-l-4 border-primary-main"
                                                : "text-text-secondary font-medium hover:text-text-primary hover:bg-bg-app/50 border-l-4 border-transparent"
                                        )}
                                    >
                                        <item.icon
                                            size={16}
                                            className={cn("transition-colors", isActive ? "text-primary-main" : "text-text-secondary")}
                                        />
                                        <span className="text-sm text-text-secondary font-medium">{item.label}</span>
                                    </a>
                                )
                            })}
                        </div>
                    </nav>

                    {/* Footer - Security & Status */}
                    <div className="p-6 border-t border-border-light/50 bg-bg-app/20">
                        <div className="flex items-center gap-3 mb-6 px-2 py-3 bg-success-bg/10 border border-success-border/20 rounded-sm">
                            <ShieldCheck size={16} className="text-success-main" />
                            <div className="flex flex-col">
                                <span className="text-[8px] font-black text-success-main uppercase tracking-widest">SİSTEM GÜVENLİ</span>
                                <span className="text-[7px] font-bold text-text-muted uppercase tracking-widest">v2.4.0-STABLE</span>
                            </div>
                        </div>

                        <button
                            className="flex items-center gap-3 px-4 py-3.5 w-full rounded-sm text-[10px] font-black uppercase tracking-[0.2em] text-danger-main bg-danger-main/5 hover:bg-danger-subtle border border-danger-main/10 hover:border-danger-main/30 transition-all active:scale-95"
                        >
                            <LogOut size={16} />
                            <span>SİSTEMDEN ÇIK</span>
                        </button>
                    </div>
                </div>
            </aside>
        </>
    )
}
