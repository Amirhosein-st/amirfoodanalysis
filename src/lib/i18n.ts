import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from '@/locales/en.json';
import fa from '@/locales/fa.json';

const resources = {
  en: { translation: en },
  fa: { translation: fa },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    lng: localStorage.getItem('language') || 'en',
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
  });

export default i18n;

export const changeLanguage = (lang: 'en' | 'fa') => {
  i18n.changeLanguage(lang);
  localStorage.setItem('language', lang);
  document.documentElement.dir = lang === 'fa' ? 'rtl' : 'ltr';
  document.documentElement.lang = lang;
};

export const getCurrentLanguage = () => {
  return i18n.language as 'en' | 'fa';
};

export const isRTL = () => {
  return i18n.language === 'fa';
};
