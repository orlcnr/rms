'use client';

import { useState, useCallback, createContext, useContext, type ReactNode } from 'react';
import type { Language } from '../config';
import { i18nConfig } from '../config';
import { translations } from '../index';

interface I18nContextValue {
  locale: Language;
  setLocale: (locale: Language) => void;
  t: typeof translations.tr;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children, initialLocale = 'tr' }: { children: ReactNode; initialLocale?: Language }) {
  const [locale, setLocaleState] = useState<Language>(initialLocale);

  const setLocale = useCallback((newLocale: Language) => {
    setLocaleState(newLocale);
    if (typeof window !== 'undefined') {
      localStorage.setItem('locale', newLocale);
    }
  }, []);

  const t = translations[locale];

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(I18nContext);
  if (!context) {
    return {
      locale: i18nConfig.defaultLocale,
      setLocale: (_locale: Language) => {},
      t: translations[i18nConfig.defaultLocale],
    };
  }
  return context;
}
