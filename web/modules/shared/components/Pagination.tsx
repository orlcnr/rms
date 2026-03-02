import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/modules/shared/utils/cn';
import { usePagination } from '../hooks/usePagination';

interface PaginationProps {
    totalItems: number;
    itemsPerPage: number;
    onPageChange: (page: number) => void;
    currentPage: number;
}

export function Pagination({
    totalItems,
    itemsPerPage,
    onPageChange,
    currentPage,
}: PaginationProps) {
    const { totalPages, goToPage, nextPage, prevPage, getPageNumbers } =
        usePagination({
            totalItems,
            itemsPerPage,
            onPageChange,
            currentPage,
        });

    if (totalPages <= 1) {
        return null;
    }

    const pageNumbers = getPageNumbers();

    return (
        <div className="flex items-center justify-between px-4 py-4 border-t border-border-light bg-bg-app/20">
            <div className="text-[11px] font-bold text-text-muted uppercase tracking-wider">
                Toplam {totalItems} kayıt • Sayfa {currentPage} / {totalPages}
            </div>
            <div className="flex items-center gap-1">
                <button
                    onClick={prevPage}
                    disabled={currentPage === 1}
                    className="p-1.5 rounded-sm border border-border-light bg-bg-surface text-text-primary disabled:opacity-30 disabled:cursor-not-allowed hover:bg-bg-app transition-all"
                >
                    <ChevronLeft size={16} />
                </button>
                {pageNumbers.map((p, index) =>
                    p === '...' ? (
                        <span key={index} className="px-1 text-text-muted">
                            ...
                        </span>
                    ) : (
                        <button
                            key={p}
                            onClick={() => goToPage(p as number)}
                            className={cn(
                                'min-w-[32px] h-8 px-2 rounded-sm text-[11px] font-black transition-all',
                                currentPage === p
                                    ? 'bg-primary-main text-white'
                                    : 'bg-bg-surface border border-border-light text-text-primary hover:bg-bg-app'
                            )}
                        >
                            {p}
                        </button>
                    )
                )}
                <button
                    onClick={nextPage}
                    disabled={currentPage === totalPages}
                    className="p-1.5 rounded-sm border border-border-light bg-bg-surface text-text-primary disabled:opacity-30 disabled:cursor-not-allowed hover:bg-bg-app transition-all"
                >
                    <ChevronRight size={16} />
                </button>
            </div>
        </div>
    );
}
