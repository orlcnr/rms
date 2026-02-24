'use client';

import { useTranslation } from '@/modules/i18n/hooks/useTranslation';
import type { Language } from '@/modules/i18n/config';

export function LanguageSelector() {
  const { locale, setLocale } = useTranslation();

  const languages: { code: Language; label: string; flag: string }[] = [
    { code: 'tr', label: 'Türkçe', flag: '🇹🇷' },
    { code: 'en', label: 'English', flag: '🇬🇧' },
  ];

  return (
    <div className="absolute top-4 right-4 z-50 flex items-center gap-2">
      {languages.map((lang) => (
        <button
          key={lang.code}
          onClick={() => setLocale(lang.code)}
          className={`
            flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200
            ${locale === lang.code 
              ? 'bg-primary/20 text-primary border border-primary/50' 
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'}
          `}
        >
          <span>{lang.flag}</span>
          <span>{lang.label}</span>
        </button>
      ))}
    </div>
  );
}
