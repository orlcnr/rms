import { Language } from './config';

// JSON translation imports
import authTr from './locales/tr/auth.json';
import authEn from './locales/en/auth.json';
import commonTr from './locales/tr/common.json';
import commonEn from './locales/en/common.json';
import restaurantsTr from './locales/tr/restaurants.json';
import restaurantsEn from './locales/en/restaurants.json';
import menusTr from './locales/tr/menus.json';
import menusEn from './locales/en/menus.json';

export type Locale = 'tr' | 'en';

export const dictionaries = {
  tr: {
    auth: authTr,
    common: commonTr,
    restaurants: restaurantsTr,
    menus: menusTr,
  },
  en: {
    auth: authEn,
    common: commonEn,
    restaurants: restaurantsEn,
    menus: menusEn,
  },
};

export type Dictionary = typeof dictionaries.tr;

export const getDictionary = (locale: Language): Dictionary => {
  return dictionaries[locale] || dictionaries.tr;
};
