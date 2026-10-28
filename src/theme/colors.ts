import type { Mode } from '@/types';
import type { FootprintLevel } from '@/lib/carbon';

export const modeColors: Record<Mode, string> = {
  walk: '#4CAF7A',
  bike: '#2FA6A0',
  scooter: '#8C7AE6',
  metro: '#D65C8F',
  transit: '#5B8DEF',
  car: '#B0B8B4',
};

export const levelColors: Record<FootprintLevel, string> = {
  low: '#3DBE7A',
  medium: '#F2C14E',
  high: '#E5735A',
};

const shared = {
  primary: '#2E7D5B',
  onPrimary: '#FFFFFF',
  achievement: '#F4D58D',
  onAchievement: '#1F2A26',
  mode: modeColors,
  level: levelColors,
};

export const lightTheme = {
  ...shared,
  dark: false,
  background: '#F7FAF8',
  card: '#FFFFFF',
  accent: '#7FD1AE',
  onAccent: '#1F2A26',
  accentSoft: '#E6F5EE',
  achievementSoft: '#FDF6E2',
  text: '#1F2A26',
  textSecondary: '#6B7A73',
  border: '#E3EAE6',
  /** ошибки проверки форм */
  danger: '#C83349',
};

export type Theme = typeof lightTheme;

// В задании для тёмной темы заданы фон, карточки, текст и акцент —
// остальные оттенки подобраны к ним.
export const darkTheme: Theme = {
  ...shared,
  dark: true,
  background: '#0F1A16',
  card: '#18262F',
  accent: '#5ED1A0',
  onAccent: '#0F1A16',
  accentSoft: '#1D3A31',
  achievementSoft: '#3A3421',
  text: '#E8F1EC',
  textSecondary: '#9DB0A7',
  border: '#27373D',
  danger: '#F07A8A',
};
