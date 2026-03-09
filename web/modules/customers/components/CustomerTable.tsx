'use client'

import React from 'react'
import { Customer, CUSTOMER_TABLE_HEADERS } from '../types'
import { useTranslation } from '@/modules/i18n/hooks/useTranslation'
import { Button } from '@/modules/shared/components/Button'
import { PhoneDisplay } from '@/modules/shared/components/PhoneDisplay'
import { Eye, Edit, Trash2 } from 'lucide-react'
import { cn } from '@/modules/shared/utils/cn'
import { format } from 'date-fns'
import { tr } from 'date-fns/locale'

interface CustomerTableProps {
    customers: Customer[]
    onEdit: (customer: Customer) => void
    onDelete: (customer: Customer) => void
    onView: (customer: Customer) => void
    isLoading?: boolean
}

export function CustomerTable({ customers, onEdit, onDelete, onView, isLoading }: CustomerTableProps) {
    const { t } = useTranslation()
    const customerT = t.customers

    if (isLoading) {
        return (
            <div className="flex-1 flex items-center justify-center p-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-main"></div>
            </div>
        )
    }

    return (
        <div className="flex-1 overflow-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 z-10 bg-bg-surface">
                    <tr className="border-b border-border-light">
                        {CUSTOMER_TABLE_HEADERS.map((header) => (
                            <th
                                key={header.key}
                                className={cn(
                                    "px-4 py-4 text-[10px] font-black text-text-muted uppercase tracking-wider",
                                    header.align === 'center' ? 'text-center' : header.align === 'right' ? 'text-right' : 'text-left'
                                )}
                            >
                                {customerT.table[header.key as keyof typeof customerT.table]}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-border-light/50">
                    {customers?.map((customer) => (
                        <tr
                            key={customer.id}
                            className="group hover:bg-bg-app transition-colors"
                        >
                            <td className="px-4 py-3">
                                <div className="flex flex-col">
                                    <span className="text-xs font-bold text-text-primary">
                                        {customer.first_name} {customer.last_name}
                                    </span>
                                    {customer.email && (
                                        <span className="text-[10px] text-text-muted">{customer.email}</span>
                                    )}
                                </div>
                            </td>
                            <td className="px-4 py-3 text-xs font-medium text-text-secondary">
                                <PhoneDisplay phone={customer.phone} />
                            </td>
                            <td className="px-4 py-3 text-xs text-center font-bold text-text-primary tabular-nums">
                                {customer.visit_count ?? 0}
                            </td>
                            <td className="px-4 py-3 text-xs text-center font-medium text-text-secondary tabular-nums">
                                {customer.last_visit ? format(new Date(customer.last_visit), 'dd MMM yyyy', { locale: tr }) : '-'}
                            </td>
                            <td className="px-4 py-3 text-xs text-right font-black text-success-main tabular-nums">
                                {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(customer.total_spent ?? 0)}
                            </td>
                            <td className="px-4 py-3 text-xs text-right font-bold text-text-secondary tabular-nums">
                                {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(customer.credit_limit ?? 0)}
                            </td>
                            <td className="px-4 py-3 text-xs text-right font-black text-danger-main tabular-nums">
                                {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(customer.current_debt ?? 0)}
                            </td>
                            <td className="px-4 py-3 text-right">
                                <div className="flex items-center justify-end gap-1.5 ">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100"
                                        onClick={() => onView(customer)}
                                    >
                                        <Eye size={14} className="text-primary-main" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100"
                                        onClick={() => onEdit(customer)}
                                    >
                                        <Edit size={14} className="text-text-secondary" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100"
                                        onClick={() => onDelete(customer)}
                                    >
                                        <Trash2 size={14} className="text-danger-main" />
                                    </Button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            {customers.length === 0 && !isLoading && (
                <div className="p-12 text-center">
                    <p className="text-sm text-text-muted font-medium uppercase tracking-widest">
                        Müşteri Bulunamadı
                    </p>
                </div>
            )}
        </div>
    )
}
