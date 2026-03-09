export function getPaymentErrorMessage(codeOrMessage?: string): string {
  switch (codeOrMessage) {
    case 'CASH_NO_ACTIVE_SESSION':
      return 'Kasa oturumu açık değil. İade yapabilmek için önce kasayı açın.'
    case 'PAYMENT_ALREADY_REFUNDED':
      return 'Bu ödeme zaten daha önce iade edildi.'
    case 'INVALID_REFUND_METHOD':
      return 'Seçilen iade yöntemi aktif değil. Lütfen geçerli bir yöntem seçin.'
    case 'PAYMENT_REFUND_NOT_ALLOWED_FOR_OPEN_ACCOUNT':
      return 'Açık hesap kayıtları iade işlemi için uygun değildir.'
    default:
      return codeOrMessage || 'Ödeme işlemi tamamlanamadı.'
  }
}
