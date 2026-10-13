import { useSettings } from '@/store/Settings';
import type { Place } from '@/types';

import { en } from './en';
import { kk } from './kk';
import type { Language } from './languages';
import { ru, type Strings } from './ru';

export type { Strings };

const STRINGS: Record<Language, Strings> = { ru, kk, en };

/** Тексты и форматирование на выбранном в настройках языке */
export function useStrings(): Strings {
  return STRINGS[useSettings().language];
}

/** У точки «моё местоположение» и у точки без адреса своего названия нет — оно зависит от языка */
export function placeName(s: Strings, place: Place): string {
  if (place.id === 'me') return s.common.myLocation;
  return place.name || s.common.mapPoint;
}
