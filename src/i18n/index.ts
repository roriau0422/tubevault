import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import mn from './locales/mn.json';
import en from './locales/en.json';

export type Language = 'mn' | 'en';

export function initI18n(lng: Language = 'mn') {
  return i18n.use(initReactI18next).init({
    lng,
    fallbackLng: 'mn',
    resources: { mn: { translation: mn }, en: { translation: en } },
    interpolation: { escapeValue: false },
  });
}

export function setLanguage(lng: Language) {
  return i18n.changeLanguage(lng);
}
