type OrderErrorCode =
  | 'ORDER_NOT_FOUND'
  | 'ORDER_INVALID_STATUS_TRANSITION'
  | 'ORDER_TERMINAL_STATE'
  | 'ORDER_MOVE_TARGET_OCCUPIED'
  | 'ORDER_MOVE_CROSS_BRANCH_NOT_ALLOWED'
  | 'ORDER_MOVE_NOT_ALLOWED_FOR_TYPE'
  | 'ORDER_ALREADY_MERGED'
  | 'ORDER_SCOPE_FORBIDDEN'
  | 'ORDER_ITEM_MENU_NOT_VISIBLE'
  | 'ORDER_LOCK_TIMEOUT'
  | 'ORDER_BAD_REQUEST'

const ORDER_ERROR_MESSAGES: Record<OrderErrorCode, string> = {
  ORDER_NOT_FOUND: 'Sipariş bulunamadı.',
  ORDER_INVALID_STATUS_TRANSITION: 'Sipariş durumu bu adıma geçirilemez.',
  ORDER_TERMINAL_STATE: 'Tamamlanmış veya iptal edilmiş sipariş güncellenemez.',
  ORDER_MOVE_TARGET_OCCUPIED: 'Hedef masa dolu. Birleştirme onayı gereklidir.',
  ORDER_MOVE_CROSS_BRANCH_NOT_ALLOWED: 'Farklı şubeye taşıma yapılamaz.',
  ORDER_MOVE_NOT_ALLOWED_FOR_TYPE: 'Bu sipariş tipi için masa taşıma yapılamaz.',
  ORDER_ALREADY_MERGED: 'Sipariş daha önce başka bir siparişe birleştirilmiş.',
  ORDER_SCOPE_FORBIDDEN: 'Bu sipariş için yetkiniz yok.',
  ORDER_ITEM_MENU_NOT_VISIBLE: 'Siparişteki ürün şube menüsünde görünmüyor.',
  ORDER_LOCK_TIMEOUT: 'Sipariş geçici olarak kilitli. Lütfen tekrar deneyin.',
  ORDER_BAD_REQUEST: 'Sipariş işlemi tamamlanamadı.',
}

export function extractOrderErrorCode(error: unknown): string | undefined {
  if (!error || typeof error !== 'object') return undefined
  const axiosLike = error as {
    response?: { data?: { code?: string; errorCode?: string; message?: string } }
    code?: string
  }
  return (
    axiosLike.response?.data?.code ||
    axiosLike.response?.data?.errorCode ||
    (typeof axiosLike.code === 'string' ? axiosLike.code : undefined)
  )
}

export function getOrderErrorMessage(code?: string): string {
  if (!code) return ORDER_ERROR_MESSAGES.ORDER_BAD_REQUEST
  if (code in ORDER_ERROR_MESSAGES) {
    return ORDER_ERROR_MESSAGES[code as OrderErrorCode]
  }
  return ORDER_ERROR_MESSAGES.ORDER_BAD_REQUEST
}

