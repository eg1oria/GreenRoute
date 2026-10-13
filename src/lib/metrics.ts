import type { Strings } from '@/i18n';
import type { MetricKind, Trip } from '@/types';

import type { IconName } from './modes';

/** Названия метрик — в src/i18n */
export const METRIC_META: Record<
  MetricKind,
  { icon: IconName; step: number; min: number; defaultTarget: number }
> = {
  co2: { icon: 'leaf', step: 0.5, min: 0.5, defaultTarget: 3 },
  activeKm: { icon: 'walk', step: 5, min: 5, defaultTarget: 15 },
  trips: { icon: 'repeat', step: 1, min: 1, defaultTarget: 5 },
};

export const METRIC_KINDS = Object.keys(METRIC_META) as MetricKind[];

/** Вклад одной поездки в метрику: кг сэкономленного CO₂, км пешком/на велосипеде, эко-поездки. */
export function metricValue(trip: Trip, kind: MetricKind): number {
  switch (kind) {
    case 'co2':
      return trip.savedG / 1000;
    case 'activeKm':
      return trip.mode === 'walk' || trip.mode === 'bike' ? trip.distanceM / 1000 : 0;
    case 'trips':
      return trip.mode === 'car' ? 0 : 1;
  }
}

export function sumMetric(trips: Trip[], kind: MetricKind, from = -Infinity, to = Infinity): number {
  return trips.reduce((sum, trip) => {
    const time = new Date(trip.date).getTime();
    return time >= from && time < to ? sum + metricValue(trip, kind) : sum;
  }, 0);
}

export function formatMetric(s: Strings, kind: MetricKind, value: number): string {
  if (kind === 'trips') return s.count.trips(Math.round(value));
  const amount = s.format.number(value, value >= 100 ? 0 : 1);
  return `${amount} ${kind === 'co2' ? s.format.units.kg : s.format.units.km}`;
}

export function startOfWeek(now = new Date()): Date {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
}
