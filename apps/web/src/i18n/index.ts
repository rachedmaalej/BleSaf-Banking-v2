import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import fr from './locales/fr.json';
import ar from './locales/ar.json';

const resources = {
  fr: { translation: fr },
  ar: { translation: ar },
};

// Get initial language from localStorage or default to French
const getInitialLanguage = () => {
  const stored = localStorage.getItem('language');
  if (stored && ['fr', 'ar'].includes(stored)) {
    return stored;
  }
  return 'fr';
};

i18n.use(initReactI18next).init({
  resources,
  lng: getInitialLanguage(),
  fallbackLng: 'fr',
  interpolation: {
    escapeValue: false,
  },
  react: {
    useSuspense: false,
  },
});

// Persist language changes
i18n.on('languageChanged', (lng) => {
  localStorage.setItem('language', lng);
  document.documentElement.dir = lng === 'ar' ? 'rtl' : 'ltr';
  document.documentElement.lang = lng;
});

export default i18n;
