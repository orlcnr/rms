'use client';

import { I18nProvider } from '@/modules/i18n/hooks/useTranslation';
import { LoginForm } from './LoginForm';
import { Language } from '@/modules/i18n/config';

export function LoginPageClient() {
  return (
    <I18nProvider>
      <LoginForm locale="tr" />
    </I18nProvider>
  );
}
