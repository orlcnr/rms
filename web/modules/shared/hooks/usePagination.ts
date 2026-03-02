import React from 'react';

interface UsePaginationProps {
    totalItems: number;
    itemsPerPage: number;
    onPageChange: (page: number) => void;
    currentPage: number;
}

export function usePagination({
    totalItems,
    itemsPerPage,
    onPageChange,
    currentPage,
}: UsePaginationProps) {
    const totalPages = Math.ceil(totalItems / itemsPerPage);

    const goToPage = React.useCallback(
        (page: number) => {
            if (page >= 1 && page <= totalPages && page !== currentPage) {
                onPageChange(page);
            }
        },
        [currentPage, onPageChange, totalPages]
    );

    const nextPage = React.useCallback(() => {
        goToPage(currentPage + 1);
    }, [currentPage, goToPage]);

    const prevPage = React.useCallback(() => {
        goToPage(currentPage - 1);
    }, [currentPage, goToPage]);

    const getPageNumbers = React.useCallback(() => {
        const pageNumbers: (number | '...')[] = [];
        const maxPagesToShow = 5; // Adjust as needed

        if (totalPages <= maxPagesToShow) {
            for (let i = 1; i <= totalPages; i++) {
                pageNumbers.push(i);
            }
        } else {
            pageNumbers.push(1);
            if (currentPage > 3) {
                pageNumbers.push('...');
            }

            for (
                let i = Math.max(2, currentPage - 1);
                i <= Math.min(totalPages - 1, currentPage + 1);
                i++
            ) {
                pageNumbers.push(i);
            }

            if (currentPage < totalPages - 2) {
                pageNumbers.push('...');
            }
            pageNumbers.push(totalPages);
        }
        return pageNumbers;
    }, [currentPage, totalPages]);

    return {
        currentPage,
        totalPages,
        goToPage,
        nextPage,
        prevPage,
        getPageNumbers,
    };
}
