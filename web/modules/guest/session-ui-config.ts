export interface GuestSessionUiState {
  title: string
  description: string
}

const DEFAULT_UI_STATE: GuestSessionUiState = {
  title: 'Oturum Sona Erdi',
  description: 'Devam etmek için lütfen masadaki QR kodu yeniden okutun.',
}

export const GUEST_SESSION_UI_CONFIG: Record<string, GuestSessionUiState> = {
  payment_completed: {
    title: 'Oturum Sona Erdi',
    description: 'Masa ödemesi tamamlandı. Yeni sipariş için lütfen QR kodu yeniden okutun.',
  },
  expired: {
    title: 'Oturum Süresi Doldu',
    description: 'Oturumunuz zaman aşımına uğradı. Devam etmek için QR kodu yeniden okutun.',
  },
  table_reset: {
    title: 'Oturum Sona Erdi',
    description: 'Masa oturumu sıfırlandı. Devam etmek için QR kodu yeniden okutun.',
  },
  table_changed: {
    title: 'Oturum Sona Erdi',
    description: 'Masa bilgileri değişti. Lütfen QR kodu yeniden okutun.',
  },
  staff_action: {
    title: 'Oturum Sonlandırıldı',
    description: 'İşletme tarafından oturum sonlandırıldı. Devam etmek için QR kodu yeniden okutun.',
  },
  user_logout: {
    title: 'Oturum Kapatıldı',
    description: 'Oturum kapatıldı. Tekrar giriş için QR kodu yeniden okutun.',
  },
  session_revoked: DEFAULT_UI_STATE,
  invalid_qr: {
    title: 'QR Geçersiz',
    description: 'QR kodu doğrulanamadı veya masa şu anda kullanılamıyor.',
  },
}

export function getGuestSessionUiState(reason?: string | null): GuestSessionUiState {
  if (!reason) {
    return DEFAULT_UI_STATE
  }

  return GUEST_SESSION_UI_CONFIG[reason] || DEFAULT_UI_STATE
}
