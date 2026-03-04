export function formatCurrency(value: number) {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    maximumFractionDigits: 2,
  }).format(value || 0)
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat('tr-TR', {
    maximumFractionDigits: 2,
  }).format(value || 0)
}
