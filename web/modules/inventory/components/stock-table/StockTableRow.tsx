'use client'

import { ArrowDownRight, ArrowUpRight, ChevronDown, ChevronRight, Loader2, MoreVertical } from 'lucide-react'
import { StockStatusBadge } from '@/modules/shared/components/StockStatusBadge'
import { cn } from '@/modules/shared/utils/cn'
import { formatNumericDisplay } from '@/modules/shared/utils/numeric'
import { Ingredient, MovementType } from '../../types'

interface StockTableRowProps {
    item: Ingredient
    isBulkEditMode: boolean
    displayQty: string
    isExpanded: boolean
    isSyncing: boolean
    onToggleExpand: () => void
    onChangeQuantity: (value: string) => void
    onAddMovement: (ingredient: Ingredient, type: MovementType) => void
    onEdit: (ingredient: Ingredient) => void
}

export function StockTableRow({
    item,
    isBulkEditMode,
    displayQty,
    isExpanded,
    isSyncing,
    onToggleExpand,
    onChangeQuantity,
    onAddMovement,
    onEdit,
}: StockTableRowProps) {
    const currentStock = item.stock?.quantity || 0

    return (
        <tr className={cn('group transition-colors', isSyncing ? 'bg-bg-muted/30 pointer-events-none' : 'hover:bg-bg-hover')}>
            <td className="px-4 py-4">
                <div className="flex items-center gap-3">
                    {isSyncing ? (
                        <div className="p-1">
                            <Loader2 className="w-4 h-4 animate-spin text-primary-main" />
                        </div>
                    ) : (
                        <button
                            onClick={onToggleExpand}
                            className="p-1 hover:bg-bg-muted rounded transition-colors"
                            title={isExpanded ? 'Kullanım detaylarını gizle' : 'Kullanım detaylarını göster'}
                        >
                            {isExpanded ? (
                                <ChevronDown className="w-4 h-4 text-text-muted" />
                            ) : (
                                <ChevronRight className="w-4 h-4 text-text-muted" />
                            )}
                        </button>
                    )}

                    <div className="min-w-0 flex-1">
                        <p className={cn('text-sm font-bold uppercase tracking-tight truncate leading-none', isSyncing ? 'text-text-muted' : 'text-text-primary')}>
                            {item.name}
                        </p>
                        <p className="text-[10px] text-text-muted font-bold tracking-widest uppercase mt-2">
                            KRİTİK SEVİYE: <span className="text-text-secondary">{formatNumericDisplay(item.critical_level)} {item.unit}</span>
                        </p>
                    </div>
                </div>
            </td>
            <td className="px-4 py-4 text-center">
                <span className="text-xs font-bold text-text-secondary uppercase tracking-widest px-2 py-1 bg-bg-muted/30 rounded-sm">{item.unit}</span>
            </td>
            <td className="px-4 py-4 text-right">
                {isBulkEditMode ? (
                    <input
                        type="text"
                        inputMode="decimal"
                        value={displayQty}
                        onChange={(e) => onChangeQuantity(e.target.value)}
                        className="w-24 px-3 py-2 text-right text-base font-bold bg-bg-app border border-border-light rounded focus:border-primary-main focus:outline-none focus:ring-1 focus:ring-primary-main"
                    />
                ) : (
                    <div className="flex flex-col items-end gap-2">
                        <span className="text-base font-bold tabular-nums tracking-tight text-text-primary">
                            {formatNumericDisplay(currentStock)}
                        </span>
                        <div className="w-24 h-2 bg-bg-muted rounded-full overflow-hidden">
                            <div
                                className={`h-full transition-all duration-300 rounded-full ${currentStock <= 0 ? 'bg-danger-main' : currentStock <= item.critical_level ? 'bg-warning-main' : 'bg-success-main'}`}
                                style={{ width: `${item.critical_level > 0 ? Math.min((currentStock / item.critical_level) * 100, 100) : 100}%` }}
                            />
                        </div>
                    </div>
                )}
            </td>
            <td className="px-4 py-4 text-center">
                <span className="text-sm font-semibold text-text-secondary">
                    {currentStock > 0 && item.average_cost ? `${formatNumericDisplay(item.average_cost)} ₺` : '-'}
                </span>
            </td>
            <td className="px-4 py-4 text-center">
                <div className="flex justify-center">
                    <StockStatusBadge
                        status={currentStock <= 0 ? 'out_of_stock' : currentStock <= item.critical_level ? 'critical' : 'in_stock'}
                    />
                </div>
            </td>
            <td className="px-4 py-4">
                <div className="flex items-center justify-end gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
                    {!isBulkEditMode && (
                        <>
                            <button
                                onClick={() => onAddMovement(item, MovementType.IN)}
                                disabled={isSyncing}
                                title="Stok Girişi"
                                className="p-2 text-success-main hover:bg-success-bg rounded-sm transition-all border border-transparent hover:border-success-border disabled:opacity-30"
                            >
                                <ArrowUpRight className="w-5 h-5" />
                            </button>
                            <button
                                onClick={() => onAddMovement(item, MovementType.OUT)}
                                disabled={isSyncing}
                                title="Stok Çıkışı"
                                className="p-2 text-danger-main hover:bg-danger-bg rounded-sm transition-all border border-transparent hover:border-danger-border disabled:opacity-30"
                            >
                                <ArrowDownRight className="w-5 h-5" />
                            </button>
                            <div className="w-px h-5 bg-border-light mx-1" />
                        </>
                    )}
                    <button
                        onClick={() => onEdit(item)}
                        disabled={isSyncing}
                        title="Düzenle"
                        className="p-2 text-text-muted hover:bg-bg-hover hover:text-text-primary rounded-sm transition-all border border-transparent hover:border-border-light disabled:opacity-30"
                    >
                        <MoreVertical className="w-5 h-5" />
                    </button>
                </div>
            </td>
        </tr>
    )
}
