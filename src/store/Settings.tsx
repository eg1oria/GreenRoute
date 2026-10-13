import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { deviceLanguage, isLanguage, type Language } from '@/i18n/languages';

const STORAGE_KEY = 'greenroute/settings/v1';

export type ThemeMode = 'system' | 'light' | 'dark';
/** Границы и шаг множителя шрифта — для ползунка в настройках */
export const FONT_SCALE_MIN = 0.85;
export const FONT_SCALE_MAX = 1.3;
export const FONT_SCALE_STEP = 0.05;

// До ползунка размер шрифта хранился как один из трёх вариантов
const LEGACY_FONT_SCALE: Record<string, number> = { small: 0.9, medium: 1, large: 1.15 };

type PersistedSettings = {
  themeMode: ThemeMode;
  /** множитель для fontSize и lineHeight */
  fontScale: number;
  language: Language;
};

type State = PersistedSettings & { hydrated: boolean };

export const DEFAULT_SETTINGS: PersistedSettings = {
  themeMode: 'system',
  fontScale: 1,
  language: deviceLanguage(),
};

const THEME_MODES: ThemeMode[] = ['system', 'light', 'dark'];

// В хранилище может лежать что угодно (старая версия, ручная правка) — неизвестные значения заменяем дефолтом
function clampFontScale(value: number): number {
  // Ползунок отдаёт значения вроде 0.9500000001
  return Math.min(FONT_SCALE_MAX, Math.max(FONT_SCALE_MIN, Math.round(value * 100) / 100));
}

function parse(raw: string | null): PersistedSettings {
  if (!raw) return DEFAULT_SETTINGS;
  const saved: Partial<PersistedSettings> & { fontSize?: string } = JSON.parse(raw) ?? {};
  const fontScale = typeof saved.fontScale === 'number' ? saved.fontScale : LEGACY_FONT_SCALE[String(saved.fontSize)];
  return {
    themeMode: THEME_MODES.includes(saved.themeMode as ThemeMode) ? (saved.themeMode as ThemeMode) : DEFAULT_SETTINGS.themeMode,
    fontScale: Number.isFinite(fontScale) ? clampFontScale(fontScale) : DEFAULT_SETTINGS.fontScale,
    language: isLanguage(saved.language) ? saved.language : DEFAULT_SETTINGS.language,
  };
}

type Settings = State & {
  setThemeMode: (themeMode: ThemeMode) => void;
  setFontScale: (fontScale: number) => void;
  setLanguage: (language: Language) => void;
  reset: () => void;
};

const SettingsContext = createContext<Settings | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>({ ...DEFAULT_SETTINGS, hydrated: false });

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => setState({ ...parse(raw), hydrated: true }))
      .catch(() => setState({ ...DEFAULT_SETTINGS, hydrated: true }));
  }, []);

  const { hydrated, themeMode, fontScale, language } = state;
  useEffect(() => {
    if (hydrated) AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ themeMode, fontScale, language })).catch(() => {});
  }, [hydrated, themeMode, fontScale, language]);

  const actions = useMemo(
    () => ({
      setThemeMode: (next: ThemeMode) => setState((prev) => ({ ...prev, themeMode: next })),
      setFontScale: (next: number) => setState((prev) => ({ ...prev, fontScale: clampFontScale(next) })),
      setLanguage: (next: Language) => setState((prev) => ({ ...prev, language: next })),
      reset: () => setState((prev) => ({ ...prev, ...DEFAULT_SETTINGS })),
    }),
    [],
  );

  const settings = useMemo(() => ({ ...state, ...actions }), [state, actions]);
  return <SettingsContext.Provider value={settings}>{children}</SettingsContext.Provider>;
}

export function useSettings(): Settings {
  const settings = useContext(SettingsContext);
  if (!settings) throw new Error('useSettings должен вызываться внутри SettingsProvider');
  return settings;
}
