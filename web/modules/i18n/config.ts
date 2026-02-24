export type Language = 'tr' | 'en';

export interface I18nConfig {
  defaultLocale: Language;
  locales: Language[];
}

export const i18nConfig: I18nConfig = {
  defaultLocale: 'tr',
  locales: ['tr', 'en'],
};
