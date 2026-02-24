import { TableStatus } from '../types';

// ============================================
// DRY: Status Style Map (Type Safety + Tailwind)
// ============================================
// ÖNEMLİ: Dinamik sınıf kullanma (örn: bg-${color}-bg)
// Tailwind safing mekanizması nedeniyle runtime'da çalışmayabilir
// Tam string mapping kullan!

export const TABLE_STATUS_STYLES = {
    [TableStatus.AVAILABLE]: 'bg-success-subtle text-success-main border-success-main/20',
    [TableStatus.OCCUPIED]: 'bg-danger-subtle text-danger-main border-danger-main/20',
    [TableStatus.RESERVED]: 'bg-warning-subtle text-warning-main border-warning-main/20',
    [TableStatus.OUT_OF_SERVICE]: 'bg-bg-muted text-text-muted border-border-light',
} as const;

export const TABLE_STATUS_CONFIG = {
    [TableStatus.AVAILABLE]: {
        label: 'BOŞ',
        style: TABLE_STATUS_STYLES[TableStatus.AVAILABLE],
    },
    [TableStatus.OCCUPIED]: {
        label: 'DOLU', 
        style: TABLE_STATUS_STYLES[TableStatus.OCCUPIED],
    },
    [TableStatus.RESERVED]: {
        label: 'REZERVE',
        style: TABLE_STATUS_STYLES[TableStatus.RESERVED],
    },
    [TableStatus.OUT_OF_SERVICE]: {
        label: 'KAPALI',
        style: TABLE_STATUS_STYLES[TableStatus.OUT_OF_SERVICE],
    },
} as const;

export type TableStatusStyle = typeof TABLE_STATUS_STYLES[keyof typeof TABLE_STATUS_STYLES];

export const getStatusConfig = (status: TableStatus) => TABLE_STATUS_CONFIG[status];
export const getStatusStyle = (status: TableStatus) => TABLE_STATUS_STYLES[status];
