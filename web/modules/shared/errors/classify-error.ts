export type AppErrorKind =
  | 'connection'
  | 'unauthorized'
  | 'forbidden'
  | 'not_found'
  | 'validation'
  | 'server'
  | 'unknown';

export type AppErrorPresentation = {
  kind: AppErrorKind;
  title: string;
  description: string;
  autoRetry: boolean;
};

export function classifyAppError(error: unknown): AppErrorPresentation {
  const message = String((error as { message?: string })?.message || '').toLowerCase();
  const status = Number((error as { status?: number })?.status || (error as { response?: { status?: number } })?.response?.status || 0);

  const isConnectionError =
    message.includes('econnrefused') ||
    message.includes('err_network') ||
    message.includes('network error') ||
    message.includes('fetch failed') ||
    message.includes('eai_again') ||
    message.includes('enotfound') ||
    message.includes('timeout');

  if (isConnectionError) {
    return {
      kind: 'connection',
      title: 'Sunucuya bağlanılıyor',
      description:
        'Backend geçici olarak erişilemiyor. Bağlantı otomatik olarak tekrar deneniyor.',
      autoRetry: true,
    };
  }

  if (status === 401) {
    return {
      kind: 'unauthorized',
      title: 'Oturum doğrulanamadı',
      description: 'Lütfen tekrar giriş yapın.',
      autoRetry: false,
    };
  }

  if (status === 403) {
    return {
      kind: 'forbidden',
      title: 'Bu işlem için yetkiniz yok',
      description: 'Erişim izni bulunmayan bir alana erişmeye çalıştınız.',
      autoRetry: false,
    };
  }

  if (status === 404) {
    return {
      kind: 'not_found',
      title: 'Aradığınız içerik bulunamadı',
      description: 'İçerik silinmiş veya adres değişmiş olabilir.',
      autoRetry: false,
    };
  }

  if (status === 422 || status === 400) {
    return {
      kind: 'validation',
      title: 'İstek doğrulanamadı',
      description: 'Gönderilen bilgileri kontrol edip tekrar deneyin.',
      autoRetry: false,
    };
  }

  if (status >= 500) {
    return {
      kind: 'server',
      title: 'Sunucuda geçici bir hata oluştu',
      description: 'Kısa süre sonra tekrar deneyin.',
      autoRetry: true,
    };
  }

  return {
    kind: 'unknown',
    title: 'Beklenmeyen bir hata oluştu',
    description: 'Sorun devam ederse teknik ekiple paylaşın.',
    autoRetry: false,
  };
}
