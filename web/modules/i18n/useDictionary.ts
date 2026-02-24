'use client';

import { Language } from './config';
import { Dictionary, dictionaries } from './dictionary';

export function useDictionary(locale: Language): Dictionary {
  return dictionaries[locale] || dictionaries.tr;
}

// Simple translation helper - gets nested value from object using dot notation
export function t(dict: Dictionary, path: string): string {
  const keys = path.split('.');
  let result: unknown = dict;
  
  for (const key of keys) {
    if (result && typeof result === 'object' && key in result) {
      result = (result as Record<string, unknown>)[key];
    } else {
      return path; // Return path if not found
    }
  }
  
  return typeof result === 'string' ? result : path;
}
