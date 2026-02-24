import { tr } from './messages/tr';
import { en } from './messages/en';
import type { Language } from './config';
import { i18nConfig } from './config';

export type { Language };
export { i18nConfig };
export { tr, en };

// Translation dictionary
export const translations = {
  tr,
  en,
} as const;
