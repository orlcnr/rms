type OrderTotalLikeItem = {
  totalPrice?: number | string | null;
};

export function calculateOrderTotalFromItems(
  items: OrderTotalLikeItem[],
): number {
  return items.reduce((sum, item) => sum + Number(item?.totalPrice ?? 0), 0);
}
