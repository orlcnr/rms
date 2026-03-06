'use client'

import { History, Search } from 'lucide-react'
import { DateTimePicker } from '@/modules/shared/components/DateTimePicker'
import { FilterSelect } from '@/modules/shared/components/FilterSelect'
import { Button } from '@/modules/shared/components/Button'
import { FilterSection } from '@/modules/shared/components/layout'
import {
    INVENTORY_ANALYSIS_TAB_OPTIONS,
    INVENTORY_LABELS,
    INVENTORY_MOVEMENT_TYPE_OPTIONS,
    INVENTORY_STOCK_STATUS_OPTIONS,
    InventoryAnalysisTab,
    InventoryMovementTypeFilter,
    InventoryView,
    MovementType,
    StockStatus,
} from '../../types'
import { cn } from '@/modules/shared/utils/cn'

interface InventoryFiltersPanelProps {
    view: InventoryView
    analysisTab: InventoryAnalysisTab
    onChangeAnalysisTab: (tab: InventoryAnalysisTab) => void
    searchQuery: string
    onChangeSearchQuery: (value: string) => void
    stockStatus: StockStatus
    onChangeStockStatus: (value: StockStatus) => void
    movementSearchQuery: string
    onChangeMovementSearchQuery: (value: string) => void
    movementTypeFilter: InventoryMovementTypeFilter | MovementType
    onChangeMovementTypeFilter: (
        value: InventoryMovementTypeFilter | MovementType,
    ) => void
    movementStartDate: string
    onChangeMovementStartDate: (value: string) => void
    movementEndDate: string
    onChangeMovementEndDate: (value: string) => void
    movementDateError: string | null
    onResetMovementFilters: () => void
}

export function InventoryFiltersPanel({
    view,
    analysisTab,
    onChangeAnalysisTab,
    searchQuery,
    onChangeSearchQuery,
    stockStatus,
    onChangeStockStatus,
    movementSearchQuery,
    onChangeMovementSearchQuery,
    movementTypeFilter,
    onChangeMovementTypeFilter,
    movementStartDate,
    onChangeMovementStartDate,
    movementEndDate,
    onChangeMovementEndDate,
    movementDateError,
    onResetMovementFilters,
}: InventoryFiltersPanelProps) {
    if (view === InventoryView.LIST) {
        return (
            <FilterSection className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="relative w-[400px] max-w-full">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                        <input
                            type="text"
                            placeholder={INVENTORY_LABELS.listSearchPlaceholder}
                            value={searchQuery}
                            onChange={(e) => onChangeSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-4 py-2.5 text-[11px] font-black uppercase tracking-wider border border-border-light bg-bg-app rounded-sm focus:outline-none focus:border-primary-main placeholder:text-text-muted transition-all shadow-sm"
                        />
                    </div>
                    <FilterSelect
                        value={stockStatus}
                        onChange={(value) => onChangeStockStatus(value as StockStatus)}
                        options={INVENTORY_STOCK_STATUS_OPTIONS}
                        className="w-[180px]"
                    />
                </div>
            </FilterSection>
        )
    }

    if (view === InventoryView.ANALYSIS) {
        return (
            <FilterSection className="flex items-center justify-between">
                <div className="flex items-center bg-bg-hover p-1 rounded-sm border border-border-light">
                    {INVENTORY_ANALYSIS_TAB_OPTIONS.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => onChangeAnalysisTab(tab.id)}
                            className={cn(
                                'px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-sm transition-all',
                                analysisTab === tab.id
                                    ? 'bg-bg-surface text-primary-main shadow-sm border border-border-light'
                                    : 'text-text-muted hover:text-text-primary',
                            )}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </FilterSection>
        )
    }

    return (
        <FilterSection className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-primary-main" />
                <span className="text-xs font-black uppercase tracking-widest">
                    {INVENTORY_LABELS.movementHistory}
                </span>
            </div>

            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                <div className="flex flex-col md:flex-row md:items-center gap-3 w-full md:w-auto">
                    <div className="relative w-[320px] max-w-full">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                        <input
                            type="text"
                            placeholder={INVENTORY_LABELS.movementSearchPlaceholder}
                            value={movementSearchQuery}
                            onChange={(e) => onChangeMovementSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-4 py-2.5 text-[11px] font-black uppercase tracking-wider border border-border-light bg-bg-app rounded-sm focus:outline-none focus:border-primary-main placeholder:text-text-muted transition-all shadow-sm"
                        />
                    </div>

                    <FilterSelect
                        value={movementTypeFilter}
                        onChange={(value) =>
                            onChangeMovementTypeFilter(
                                value as InventoryMovementTypeFilter | MovementType,
                            )
                        }
                        options={INVENTORY_MOVEMENT_TYPE_OPTIONS}
                        className="w-[180px]"
                    />

                    <div className="w-[220px] max-w-full">
                        <DateTimePicker
                            id="inventory-movement-start-date"
                            label=""
                            value={movementStartDate}
                            onChange={onChangeMovementStartDate}
                            showTime={false}
                            placeholder={INVENTORY_LABELS.movementStartDate}
                        />
                    </div>

                    <div className="w-[220px] max-w-full">
                        <DateTimePicker
                            id="inventory-movement-end-date"
                            label=""
                            value={movementEndDate}
                            onChange={onChangeMovementEndDate}
                            showTime={false}
                            placeholder={INVENTORY_LABELS.movementEndDate}
                        />
                    </div>
                </div>

                <Button
                    variant="outline"
                    onClick={onResetMovementFilters}
                    className="w-full md:w-auto text-[10px] font-black uppercase tracking-wider"
                >
                    {INVENTORY_LABELS.resetFilters}
                </Button>
            </div>

            {movementDateError ? (
                <p className="text-[11px] font-bold text-danger-main">
                    {movementDateError}
                </p>
            ) : null}
        </FilterSection>
    )
}
