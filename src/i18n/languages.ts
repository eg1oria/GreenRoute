import { getLocales } from 'expo-localization';

export type Language = 'ru' | 'kk' | 'en';

/** Названия — на самих языках: так язык узнают при любом языке интерфейса */
export const LANGUAGES: { value: Language; label: string }[] = [
  { value: 'ru', label: 'Русский' },
  { value: 'kk', label: 'Қазақша' },
  { value: 'en', label: 'English' },
];

export function isLanguage(value: unknown): value is Language {
  return LANGUAGES.some((language) => language.value === value);
}

/** Язык устройства, если приложение его поддерживает, иначе английский */
export function deviceLanguage(): Language {
  const code = getLocales()[0]?.languageCode;
  return isLanguage(code) ? code : 'en';
}
