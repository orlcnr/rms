'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Search, X, Loader2, Plus } from 'lucide-react'
import { cn } from '@/modules/shared/utils/cn'

interface Option {
    id: string
    label: string
    sublabel?: string
}

interface SearchableSelectProps {
    options: Option[]
    selectedId?: string | undefined
    onChange: (option: Option) => void
    onSearch: (query: string) => Promise<Option[]>
    placeholder?: string
    disabled?: boolean
    className?: string
    showAddNew?: boolean
    onAddNew?: (query: string) => void
}

export function SearchableSelect({
    options,
    selectedId,
    onChange,
    onSearch,
    placeholder = 'Ara...',
    disabled = false,
    className,
    showAddNew = false,
    onAddNew
}: SearchableSelectProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const [searchResults, setSearchResults] = useState<Option[]>([])
    const [isSearching, setIsSearching] = useState(false)
    const [showAddNewOption, setShowAddNewOption] = useState(false)
    const inputRef = useRef<HTMLInputElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const onSearchRef = useRef(onSearch)
    const onAddNewRef = useRef(onAddNew)
    
    // Keep onSearch ref updated
    useEffect(() => {
        onSearchRef.current = onSearch
    }, [onSearch])

    // Keep onAddNew ref updated
    useEffect(() => {
        if (onAddNew) {
            onAddNewRef.current = onAddNew
        }
    }, [onAddNew])

    const filteredOptions = searchQuery.length > 0 
        ? searchResults 
        : options

    const selectedOption = selectedId ? options.find(opt => opt.id === selectedId) : undefined
    
    // Check if we should show "Add new" option - show when there's a search query and either there are results or no results
    const shouldShowAddNew = showAddNew && searchQuery.length > 0 && showAddNewOption

    // Dropdown'u açık tut ve arama yap
    useEffect(() => {
        if (!searchQuery || searchQuery.trim().length === 0) {
            setSearchResults([])
            return
        }
        
        const timer = setTimeout(async () => {
            setIsSearching(true)
            try {
                const results = await onSearchRef.current(searchQuery)
                setSearchResults(results)
            } catch (error) {
                console.error('Search error:', error)
            } finally {
                setIsSearching(false)
            }
        }, 300)

        return () => clearTimeout(timer)
    }, [searchQuery])

    // Close on outside click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const handleSelect = (option: Option) => {
        onChange(option)
        setIsOpen(false)
        setSearchQuery('')
        setSearchResults([])
    }

    const handleClear = (e?: React.MouseEvent | React.KeyboardEvent) => {
        e?.stopPropagation()
        setSearchQuery('')
        setSearchResults([])
        // Parent'a da bildir - seçili olanı kaldır
        if (selectedOption) {
            onChange({ id: '', label: '' } as Option)
        }
    }

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value
        setSearchQuery(value)
        if (!isOpen) setIsOpen(true)
        
        // Show "Add new" option when user types and there's no exact match
        if (showAddNew && value.length > 0) {
            const hasExactMatch = options.some(opt => 
                opt.label.toLowerCase() === value.toLowerCase()
            )
            setShowAddNewOption(!hasExactMatch)
        }
    }

    const handleInputFocus = () => {
        if (!disabled) {
            setIsOpen(true)
            // Focus yapildiginde, eger options varsa dropdown'da goster
            // Arama yapilmadan once mevcut options gosterilsin
            if (options.length > 0 && searchQuery.length === 0) {
                setSearchResults(options)
            }
            // Show add new option on focus if there's a search query
            if (showAddNew && searchQuery.length > 0) {
                const hasExactMatch = options.some(opt => 
                    opt.label.toLowerCase() === searchQuery.toLowerCase()
                )
                setShowAddNewOption(!hasExactMatch)
            }
        }
    }

    const handleAddNew = () => {
        if (onAddNewRef.current) {
            onAddNewRef.current(searchQuery)
        }
    }

    return (
        <div ref={containerRef} className={cn('relative', className)}>
            {/* Gerçek input - arama yapılabilir */}
            <div 
                className={cn(
                    'w-full flex items-center gap-2 bg-bg-app border border-border-light px-3 py-2 rounded-sm transition-all',
                    'focus-within:ring-2 focus-within:ring-primary-main focus-within:ring-offset-1 focus-within:border-primary-main/50',
                    disabled && 'opacity-50 cursor-not-allowed'
                )}
                onClick={() => {
                    // Tıklandığında input'a odaklan
                    inputRef.current?.focus();
                }}
            >
                <Search size={16} className="text-text-muted shrink-0 pointer-events-none" />
                <input
                    ref={inputRef}
                    type="text"
                    disabled={disabled}
                    value={searchQuery}
                    onChange={handleInputChange}
                    onFocus={handleInputFocus}
                    placeholder={selectedOption?.label || placeholder}
                    className={cn(
                        'flex-1 bg-transparent text-base font-semibold text-text-primary outline-none min-w-0',
                        !searchQuery && !selectedOption && 'text-text-muted'
                    )}
                    onClick={(e) => e.stopPropagation()}
                    autoComplete="off"
                    aria-haspopup="listbox"
                    aria-expanded={isOpen}
                />
                {searchQuery ? (
                    <button
                        type="button"
                        onClick={handleClear}
                        className="p-0.5 hover:bg-bg-muted rounded cursor-pointer shrink-0"
                    >
                        <X size={14} className="text-text-muted" />
                    </button>
                ) : selectedOption ? (
                    <button
                        type="button"
                        onClick={handleClear}
                        className="p-0.5 hover:bg-bg-muted rounded cursor-pointer shrink-0"
                    >
                        <X size={14} className="text-text-muted" />
                    </button>
                ) : null}
            </div>

            {/* Dropdown */}
            {isOpen && (
                <div 
                    id="searchable-select-dropdown"
                    className="absolute z-[100] w-full mt-1 bg-bg-surface border border-border-light rounded-sm shadow-xl max-h-64 overflow-y-auto"
                    role="listbox"
                >
                    {isSearching ? (
                        <div className="flex items-center justify-center p-4">
                            <Loader2 size={20} className="animate-spin text-text-muted" />
                        </div>
                    ) : filteredOptions.length > 0 || (showAddNew && searchQuery.length > 0) ? (
                        <ul>
                            {filteredOptions.map((option) => (
                                <li
                                    key={option.id}
                                    role="option"
                                    aria-selected={option.id === selectedId}
                                    onClick={() => handleSelect(option)}
                                    className={cn(
                                        'px-3 py-2 cursor-pointer transition-colors',
                                        'hover:bg-bg-muted',
                                        option.id === selectedId ? 'bg-primary-subtle text-primary-main' : 'text-text-primary'
                                    )}
                                >
                                    <div className="text-base font-semibold">{option.label}</div>
                                    {option.sublabel && (
                                        <div className="text-xs text-text-muted">{option.sublabel}</div>
                                    )}
                                </li>
                            ))}
                            {/* Show "Add new" option when enabled and there's a search query */}
                            {shouldShowAddNew && (
                                <li
                                    role="option"
                                    onClick={handleAddNew}
                                    className={cn(
                                        'px-3 py-2 cursor-pointer transition-colors border-t border-border-light',
                                        'hover:bg-success-subtle text-success-main'
                                    )}
                                >
                                    <div className="text-base font-semibold flex items-center gap-2">
                                        <Plus size={16} />
                                        "{searchQuery}" yeni malzeme olarak ekle
                                    </div>
                                </li>
                            )}
                        </ul>
                    ) : (
                        <div className="px-3 py-4 text-center text-text-muted text-sm flex flex-col gap-2">
                            <span>Sonuç bulunamadı</span>
                            {showAddNew && searchQuery.length > 0 && (
                                <button
                                    type="button"
                                    onClick={handleAddNew}
                                    className="text-success-main hover:underline text-sm font-semibold flex items-center justify-center gap-1"
                                >
                                    <Plus size={14} />
                                    "{searchQuery}" yeni malzeme olarak ekle
                                </button>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
