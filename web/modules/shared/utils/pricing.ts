type PricedItem = {
  id?: string
  price: number | null | undefined
  effective_price?: number | null
}

export function resolveDisplayPrice(
  item: PricedItem,
  options?: { branchContext?: boolean },
): number {
  if (options?.branchContext) {
    // Branch contract:
    // - effective_price: branch override price (or base fallback)
    // - price: backend already equal to effective in branch context
    if (item.effective_price == null) {
      console.error('MISSING_EFFECTIVE_PRICE', {
        itemId: item.id,
      })
    }
    return Number(item.effective_price ?? item.price ?? 0)
  }

  return Number(item.price ?? 0)
}
