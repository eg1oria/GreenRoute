import type { Mode } from '@/types';

/** Условные коэффициенты, г CO₂ на пассажиро-километр. */
export const EMISSION_G_PER_KM: Record<Mode, number> = {
  walk: 0,
  bike: 0,
  transit: 60,
  car: 170,
};

export type FootprintLevel = 'low' | 'medium' | 'high';

export function co2Grams(mode: Mode, distanceM: number): number {
  return Math.round((distanceM / 1000) * EMISSION_G_PER_KM[mode]);
}

/** Светофор: доля следа от той же поездки на авто. */
export function footprintLevel(co2G: number, carCo2G: number): FootprintLevel {
  if (carCo2G <= 0) return 'low';
  const share = co2G / carCo2G;
  if (share < 0.25) return 'low';
  if (share < 0.7) return 'medium';
  return 'high';
}

export const LEVEL_LABEL: Record<FootprintLevel, string> = {
  low: 'Низкий след',
  medium: 'Средний след',
  high: 'Высокий след',
};

// Условные эквиваленты: взрослое дерево поглощает около 22 кг CO₂ в год,
// одна зарядка смартфона — около 8 г CO₂.
const TREE_G_PER_DAY = 60;
const PHONE_CHARGE_G = 8;

export function equivalents(savedG: number) {
  return {
    treeDays: Math.round(savedG / TREE_G_PER_DAY),
    phoneCharges: Math.round(savedG / PHONE_CHARGE_G),
  };
}
