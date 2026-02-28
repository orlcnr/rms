// ============================================
// BOARD FILTERS
// Kanban board filtreleri
// ============================================

'use client'

import { useState, useCallback } from 'react'
import { BoardFilters as BoardFiltersType } from '../types'
import { Search, X } from 'lucide-react'

interface BoardFiltersProps {
  filters: BoardFiltersType
  onFilterChange: (filters: Partial<BoardFiltersType>) => void
  onClearFilters: () => void
}

export function BoardFilters({
  filters,
  onFilterChange,
  onClearFilters,
}: BoardFiltersProps) {
  const [searchValue, setSearchValue] = useState(filters.search || '')

  // Handle search
  const handleSearch = useCallback((value: string) => {
    setSearchValue(value)
    onFilterChange({ search: value || undefined })
  }, [onFilterChange])

  // Check if any filter is active
  const hasActiveFilters = !!filters.search

  return (
    <div className="flex items-center gap-4 p-3 font-semibold uppercase tracking-tight">
      {/* Search */}
      <div className="relative w-[400px] max-w-full">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
        <input
          type="text"
          placeholder="Müşteri adı, masa no veya ürün ara..."
          value={searchValue}
          onChange={(e) => handleSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 text-[11px] font-black uppercase tracking-wider border border-border-light bg-bg-app rounded-sm focus:outline-none focus:border-primary-main placeholder:text-text-muted transition-all shadow-sm"
        />
        {searchValue && (
          <button
            onClick={() => handleSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Clear Filters */}
      {hasActiveFilters && (
        <button
          onClick={onClearFilters}
          className="flex items-center gap-2 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-danger-main hover:bg-danger-subtle rounded-sm transition-all active:scale-95"
        >
          <X className="w-3.5 h-3.5" />
          Temizle
        </button>
      )}
    </div>
  )
}
