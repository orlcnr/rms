'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { SubHeaderSection, FilterSection, BodySection } from '@/modules/shared/components/layout'
import { Button } from '@/modules/shared/components/Button'
import { SearchInput } from '@/modules/shared/components/SearchInput'
import { RmsSwitch } from '@/modules/shared/components/RmsSwitch'
import { CustomerTable } from './CustomerTable'
import { CustomerForm } from './CustomerForm'
import { CustomerDetails } from './CustomerDetails'
import { customerService } from '../services/customers.service'
import { Customer } from '../types'
import { useTranslation } from '@/modules/i18n/hooks/useTranslation'
import { Plus, RefreshCcw } from 'lucide-react'
import { PaginatedResponse } from '@/modules/shared/types'
import { toast } from 'sonner'
import { Pagination } from '@/modules/shared/components/Pagination'

export function CustomerClient() {
    const { t } = useTranslation()
    const customerT = t.customers
    const [customers, setCustomers] = useState<Customer[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isSyncing, setIsSyncing] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const [isFormOpen, setIsFormOpen] = useState(false)
    const [isDetailsOpen, setIsDetailsOpen] = useState(false)
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
    const [hasDebt, setHasDebt] = useState(false)

    const [pagination, setPagination] = useState({
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 1
    })

    const fetchCustomers = useCallback(async (page = 1, search = '') => {
        setIsLoading(page === 1)
        setIsSyncing(true)
        try {
            const response = await customerService.getCustomers({
                page,
                limit: pagination.limit,
                search: search || undefined,
                hasDebt: hasDebt || undefined
            })
            setCustomers(response.items)
            setPagination(prev => ({
                ...prev,
                page: response.meta.currentPage,
                total: response.meta.totalItems,
                totalPages: response.meta.totalPages
            }))
        } catch (error) {
            console.error('Failed to fetch customers:', error)
        } finally {
            setIsLoading(false)
            setIsSyncing(false)
        }
    }, [pagination.limit, hasDebt])

    useEffect(() => {
        fetchCustomers(1, searchQuery)
    }, [searchQuery, fetchCustomers])

    const handleRefresh = () => {
        fetchCustomers(pagination.page, searchQuery)
    }

    const handleAdd = () => {
        setSelectedCustomer(null)
        setIsFormOpen(true)
    }

    const handleEdit = (customer: Customer) => {
        setSelectedCustomer(customer)
        setIsFormOpen(true)
    }

    const handleDelete = async (customer: Customer) => {
        if (!confirm(customerT.messages.deleteConfirm)) return

        try {
            await customerService.deleteCustomer(customer.id)
            toast.success(customerT.messages.deleteSuccess)
            handleRefresh()
        } catch (error) {
            console.error('Failed to delete customer:', error)
        }
    }

    const handleView = (customer: Customer) => {
        setSelectedCustomer(customer)
        setIsDetailsOpen(true)
    }

    return (
        <div className="flex flex-col flex-1 h-full overflow-hidden px-Layout">
            <SubHeaderSection
                title={customerT.title}
                description={customerT.description}
                moduleColor="bg-info-main"
                isSyncing={isSyncing}
                onRefresh={handleRefresh}
                actions={
                    <Button onClick={handleAdd} className="gap-2">
                        <Plus size={16} />
                        {customerT.newCustomer}
                    </Button>
                }
            />

            <main className="flex flex-col flex-1 pb-6 min-h-0">
                <FilterSection className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                        <SearchInput
                            value={searchQuery}
                            onChange={setSearchQuery}
                            placeholder={customerT.searchPlaceholder}
                            className="w-[400px]"
                        />
                        <RmsSwitch
                            checked={hasDebt}
                            onChange={setHasDebt}
                            label={customerT.debtOnly}
                            labelOn="AKTİF"
                            labelOff="TÜMÜ"
                            theme="danger"
                            size="sm"
                            containerClassName="h-[42px] py-0 px-3 min-w-[180px]"
                        />
                    </div>

                    <div className="flex items-center gap-6 ml-6 border-l border-border-light pl-6">
                        <div className="flex flex-col items-end">
                            <span className="text-[10px] font-black text-text-muted uppercase tracking-widest leading-none mb-1">
                                TOPLAM KAYIT
                            </span>
                            <span className="text-xl font-black text-text-primary tabular-nums leading-none">
                                {pagination.total}
                            </span>
                        </div>
                    </div>
                </FilterSection>

                <BodySection noPadding className="relative overflow-hidden flex flex-col">
                    <CustomerTable
                        customers={customers}
                        isLoading={isLoading}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        onView={handleView}
                    />

                    <Pagination
                        totalItems={pagination.total}
                        itemsPerPage={pagination.limit}
                        onPageChange={(newPage) => fetchCustomers(newPage, searchQuery)}
                        currentPage={pagination.page}
                    />
                </BodySection>
            </main>

            {/* Modals & Drawers */}
            <CustomerForm
                isOpen={isFormOpen}
                onClose={() => setIsFormOpen(false)}
                customer={selectedCustomer || undefined}
                onSuccess={handleRefresh}
            />

            <CustomerDetails
                isOpen={isDetailsOpen}
                onClose={() => setIsDetailsOpen(false)}
                customer={selectedCustomer}
            />
        </div>
    )
}
