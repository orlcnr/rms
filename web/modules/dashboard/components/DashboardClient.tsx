'use client'

import React from 'react'
import { HeroStats } from './HeroStats'
import { RecentOrders } from './RecentOrders'
import { UpcomingReservations } from './UpcomingReservations'
import { DashboardNavigation } from './DashboardNavigation'
import { RevenueChart } from './RevenueChart'
import { DashboardFooter } from './DashboardFooter'

export default function DashboardClient() {
    return (
        <div className="min-h-screen bg-bg-app erp-container">
            {/* 1) Page Title Section - Authoritative & Enterprise */}
            <div className="mb-5">
                <h1 className="text-2xl font-black text-text-primary uppercase tracking-[0.15em]">KONTROL PANELİ</h1>
                <p className="text-xs text-text-muted font-bold uppercase tracking-widest mt-1.5 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-success-main" />
                    SİSTEM ÇEVRİMİŞİ • GÜNCEL VERİ AKIŞI
                </p>
            </div>

            <div className="space-y-5">
                {/* 2) KPI Grid - 4 Equal Structured Cards */}
                <HeroStats />

                {/* 3) Management Shortcuts Panel - Moved to top for quick access */}
                <div className="pt-2 pb-2">
                    <div className="mb-3">
                        <h2 className="text-xs font-black text-text-muted uppercase tracking-[0.15em]">YÖNETİM KISAYOLLARI</h2>
                    </div>
                    <DashboardNavigation />
                </div>

                {/* 4) Two-Column Layout - Chart + Orders */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
                    {/* Left: Recent Orders Table (High Density) */}
                    <div className="lg:col-span-8">
                        <RecentOrders />
                    </div>

                    {/* Right: Reservations List (Structured) */}
                    <div className="lg:col-span-4">
                        <UpcomingReservations />
                    </div>
                </div>

                {/* 5) Analytics Section - Revenue Chart */}
                <RevenueChart />

                {/* 6) Enterprise Footer */}
                <DashboardFooter />
            </div>
        </div>
    )
}
