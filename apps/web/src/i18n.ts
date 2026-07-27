import i18next from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en.json";
import id from "./locales/id.json";

export const LANGUAGE_STORAGE_KEY = "loopice_lang";
export const SUPPORTED_LANGUAGES = ["en", "id"] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

function getInitialLanguage(): SupportedLanguage {
  const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
  if (stored === "en" || stored === "id") return stored;
  return navigator.language.toLowerCase().startsWith("id") ? "id" : "en";
}

i18next.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    id: { translation: id },
  },
  lng: getInitialLanguage(),
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

export function setLanguage(lang: SupportedLanguage) {
  localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
  i18next.changeLanguage(lang);
}

export default i18next;
