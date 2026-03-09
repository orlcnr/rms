'use client'

import React, { useState, useEffect } from 'react'
import { Modal } from '@/modules/shared/components/Modal'
import { Customer } from '../types'
import { Order } from '@/modules/orders/types'
import { customerService } from '../services/customers.service'
import { useTranslation } from '@/modules/i18n/hooks/useTranslation'
import { format } from 'date-fns'
import { tr } from 'date-fns/locale'
import { PhoneDisplay } from '@/modules/shared/components/PhoneDisplay'

interface CustomerDetailsProps {
    isOpen: boolean
    onClose: () => void
    customer: Customer | null
}

export function CustomerDetails({ isOpen, onClose, customer }: CustomerDetailsProps) {
    const { t } = useTranslation()
    const customerT = t.customers

    const [orders, setOrders] = useState<Order[]>([])
    const [isLoading, setIsLoading] = useState(false)

    useEffect(() => {
        if (customer && isOpen) {
            const fetchOrders = async () => {
                setIsLoading(true)
                try {
                    const data = await customerService.getCustomerOrders(customer.id)
                    setOrders(data)
                } catch (error) {
                    console.error('Failed to fetch customer orders:', error)
                } finally {
                    setIsLoading(false)
                }
            }
            fetchOrders()
        }
    }, [customer, isOpen])

    if (!customer) return null

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={customerT.details.title}
            maxWidth="max-w-2xl"
        >
            <div className="space-y-8 pb-12">
                {/* Profile Card */}
                <div className="flex items-center gap-4 p-4 bg-bg-app rounded-sm border border-border-light">
                    <div className="w-12 h-12 rounded-full bg-info-main/10 flex items-center justify-center text-info-main font-black text-lg">
                        {customer.first_name[0]}{customer.last_name[0]}
                    </div>
                    <div className="flex flex-col">
                        <h3 className="text-sm font-black text-text-primary uppercase tracking-tight">
                            {customer.first_name} {customer.last_name}
                        </h3>
                        <PhoneDisplay
                            phone={customer.phone}
                            className="text-text-muted"
                        />
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="space-y-3">
                    <h4 className="text-[10px] font-black text-text-muted uppercase tracking-widest px-1">
                        {customerT.details.stats}
                    </h4>
                    <div className="grid grid-cols-3 gap-3">
                        <div className="p-3 bg-bg-surface border border-border-light rounded-sm flex flex-col">
                            <span className="text-[9px] font-bold text-text-muted uppercase mb-1">{customerT.details.visitCount}</span>
                            <span className="text-lg font-black text-text-primary">{customer.visit_count ?? 0}</span>
                        </div>
                        <div className="p-3 bg-bg-surface border border-border-light rounded-sm flex flex-col">
                            <span className="text-[9px] font-bold text-text-muted uppercase mb-1">{customerT.details.totalSpent}</span>
                            <span className="text-lg font-black text-success-main tabular-nums">
                                {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(customer.total_spent ?? 0)}
                            </span>
                        </div>
                        <div className="p-3 bg-bg-surface border border-border-light rounded-sm flex flex-col">
                            <span className="text-[9px] font-bold text-text-muted uppercase mb-1">{customerT.details.currentDebt}</span>
                            <span className="text-lg font-black text-danger-main tabular-nums">
                                {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(customer.current_debt ?? 0)}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Order History */}
                <div className="space-y-3">
                    <h4 className="text-[10px] font-black text-text-muted uppercase tracking-widest px-1">
                        {customerT.details.orderHistory}
                    </h4>
                    <div className="space-y-2">
                        {isLoading ? (
                            <div className="flex justify-center p-8">
                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-main"></div>
                            </div>
                        ) : orders.length > 0 ? (
                            orders.map((order) => (
                                <div
                                    key={order.id}
                                    className="flex items-center justify-between p-3 bg-bg-surface border border-border-light rounded-sm hover:border-primary-main/30 cursor-pointer transition-colors"
                                >
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-bold text-text-primary uppercase">
                                            {order.table?.name || 'PAKET SERVİS'}
                                        </span>
                                        <span className="text-[9px] text-text-muted">
                                            {format(new Date(order.created_at), 'dd MMM yyyy HH:mm', { locale: tr })}
                                        </span>
                                    </div>
                                    <span className="text-xs font-black text-text-primary tabular-nums">
                                        {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(order.totalAmount)}
                                    </span>
                                </div>
                            ))
                        ) : (
                            <p className="text-center p-8 text-xs text-text-muted font-bold uppercase tracking-widest">
                                HENÜZ SİPARİŞ YOK
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </Modal>
    )
}
