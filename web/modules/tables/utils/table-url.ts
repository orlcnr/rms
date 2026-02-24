// ============================================
// DRY: Merkezi QR URL Oluşturma
// ============================================
// Bu mantığı birden fazla yerde kullanabiliriz:
// - QrCodeModal
// - Toplu PDF indirme
// - QR kod batch oluşturma

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://menun.com';

export const getTableOrderUrl = (
    restaurantSlug: string, 
    tableId: string,
    tableName?: string
): string => {
    const url = new URL(`/r/${restaurantSlug}`, APP_URL);
    url.searchParams.set('table', tableId);
    if (tableName) {
        url.searchParams.set('name', tableName);
    }
    return url.toString();
};

export const getTableQrData = (
    restaurantSlug: string,
    tableId: string,
    tableName: string,
    restaurantName?: string
) => {
    return {
        url: getTableOrderUrl(restaurantSlug, tableId, tableName),
        tableId,
        tableName,
        restaurantSlug,
        restaurantName,
    };
};
