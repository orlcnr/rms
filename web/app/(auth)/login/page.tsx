'use client';

import { useState, useEffect } from 'react';
import { LoginForm } from './_components/LoginForm';

type Language = 'tr' | 'en';

const translations = {
  tr: {
    dashboard: {
      subtitle: 'RMS Enterprise Restaurant Management System. Operasyonlarınızı kurumsal verimlilik ve güvenilir bir altyapıyla yönetin.',
    },
    auth: {
      loginTitle: 'SİSTEM GİRİŞİ',
      loginSubtitle: 'Lütfen oturum açmak için kimlik bilgilerinizi doğrulayın.',
    },
    footer: {
      helpCenter: 'DESTEK MERKEZİ',
      privacyPolicy: 'GİZLİLİK POLİTİKASI',
      termsOfService: 'KULLANIM KOŞULLARI',
    },
  },
  en: {
    dashboard: {
      subtitle: 'RMS Enterprise Restaurant Management System. Manage your operations with corporate efficiency and reliable infrastructure.',
    },
    auth: {
      loginTitle: 'SYSTEM LOGIN',
      loginSubtitle: 'Please verify your credentials to sign in.',
    },
    footer: {
      helpCenter: 'SUPPORT CENTER',
      privacyPolicy: 'PRIVACY POLICY',
      termsOfService: 'TERMS OF SERVICE',
    },
  },
};

export default function LoginPage() {
  const [locale, setLocale] = useState<Language>('tr');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('locale') as Language;
    if (saved && (saved === 'tr' || saved === 'en')) {
      setLocale(saved);
    }
  }, []);

  const t = translations[locale];

  const switchLanguage = (lang: Language) => {
    setLocale(lang);
    localStorage.setItem('locale', lang);
  };

  if (!mounted) {
    return null;
  }

  return (
    <div className="flex min-h-screen w-full bg-bg-app">
      {/* Top Header / Language Selector */}
      <div className="absolute top-6 right-6 z-50 flex items-center gap-3">
        <div className="flex bg-bg-surface border border-border-light rounded-sm p-1 shadow-sm">
          <button
            onClick={() => switchLanguage('tr')}
            className={`px-3 py-1.5 rounded-sm text-[10px] font-black uppercase tracking-widest transition-all ${locale === 'tr'
                ? 'bg-primary-main text-text-inverse'
                : 'text-text-muted hover:bg-bg-hover'
              }`}
          >
            TR
          </button>
          <button
            onClick={() => switchLanguage('en')}
            className={`px-3 py-1.5 rounded-sm text-[10px] font-black uppercase tracking-widest transition-all ${locale === 'en'
                ? 'bg-primary-main text-text-inverse'
                : 'text-text-muted hover:bg-bg-hover'
              }`}
          >
            EN
          </button>
        </div>
      </div>

      {/* Left Side: Professional Identity (Clean presentation) */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-bg-surface border-r border-border-light items-center justify-center p-20">
        <div className="max-w-xl">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-14 h-14 bg-primary-main rounded-sm flex items-center justify-center shadow-sm">
              <span className="material-symbols-outlined text-text-inverse text-3xl">terminal</span>
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-[0.2em] text-text-primary">RMS <span className="text-primary-main">ERP</span></h1>
              <p className="text-[10px] font-black text-text-muted uppercase tracking-[0.3em] mt-1">ENTERPRISE SOLUTIONS</p>
            </div>
          </div>
          <div className="space-y-6">
            <h2 className="text-4xl font-black text-text-primary leading-tight tracking-tight uppercase">
              KURUMSAL RESTORAN <br />YÖNETİM SİSTEMİ
            </h2>
            <div className="w-20 h-1.5 bg-primary-main rounded-full" />
            <p className="text-lg text-text-secondary font-medium leading-relaxed max-w-md">
              {t.dashboard.subtitle}
            </p>
          </div>

          {/* System Status Indicators - ERP Feel */}
          <div className="mt-16 grid grid-cols-2 gap-8">
            <div className="border-l-2 border-border-light pl-4">
              <p className="text-2xl font-black text-text-primary tracking-tighter tabular-nums leading-none">99.9%</p>
              <p className="text-[9px] text-text-muted font-black uppercase tracking-widest mt-2">SİSTEM ÇALIŞMA SÜRESİ</p>
            </div>
            <div className="border-l-2 border-border-light pl-4">
              <p className="text-2xl font-black text-text-primary tracking-tighter tabular-nums leading-none">256-BIT</p>
              <p className="text-[9px] text-text-muted font-black uppercase tracking-widest mt-2">UÇTAN UCA ŞİFRELEME</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side: Login Form (Structured Card) */}
      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-6 sm:p-12 relative overflow-hidden">
        {/* Subtle pattern instead of blur */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(var(--border-medium) 1px, transparent 0)', backgroundSize: '24px 24px' }} />

        <div className="w-full max-w-sm space-y-10 z-20">
          <div className="bg-bg-surface border border-border-light rounded-sm p-8 sm:p-10 shadow-sm relative">
            <div className="absolute top-0 left-0 w-full h-1 bg-primary-main" />

            <div className="mb-10 flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-muted rounded-sm flex items-center justify-center text-text-primary border border-border-light mb-6">
                <span className="material-symbols-outlined">lock</span>
              </div>
              <h3 className="text-xl font-bold text-text-primary mb-2 uppercase tracking-widest">{t.auth.loginTitle}</h3>
              <p className="text-text-muted text-[10px] font-bold uppercase tracking-widest">{t.auth.loginSubtitle}</p>
            </div>

            <LoginForm locale={locale} />
          </div>

          {/* Footer Blocks */}
          <div className="flex flex-col items-center gap-6">
            <div className="flex items-center justify-center gap-8 border-y border-border-light/50 py-4 w-full">
              <a className="text-[9px] font-black text-text-muted hover:text-primary-main transition-colors uppercase tracking-[0.15em]" href="#">{t.footer.helpCenter}</a>
              <a className="text-[9px] font-black text-text-muted hover:text-primary-main transition-colors uppercase tracking-[0.15em]" href="#">{t.footer.privacyPolicy}</a>
              <a className="text-[9px] font-black text-text-muted hover:text-primary-main transition-colors uppercase tracking-[0.15em]" href="#">{t.footer.termsOfService}</a>
            </div>
            <p className="text-[8px] font-bold text-text-muted/60 uppercase tracking-[0.2em]">
              &copy; {new Date().getFullYear()} RMS ERP SYSTEMS • TÜM HAKLARI SAKLIDIR
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
