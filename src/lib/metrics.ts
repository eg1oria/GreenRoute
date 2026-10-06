import type { MetricKind, Trip } from '@/types';

import { formatNumber, plural } from './format';
import type { IconName } from './modes';

export const METRIC_META: Record<
  MetricKind,
  { title: string; icon: IconName; step: number; min: number; defaultTarget: number }
> = {
  co2: { title: 'Сэкономить CO₂', icon: 'leaf', step: 0.5, min: 0.5, defaultTarget: 3 },
  activeKm: { title: 'Активные километры', icon: 'walk', step: 5, min: 5, defaultTarget: 15 },
  trips: { title: 'Эко-поездки', icon: 'repeat', step: 1, min: 1, defaultTarget: 5 },
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

export function metricUnit(kind: MetricKind, value: number): string {
  switch (kind) {
    case 'co2':
      return 'кг';
    case 'activeKm':
      return 'км';
    case 'trips':
      return plural(value, ['поездка', 'поездки', 'поездок']);
  }
}

export function formatMetric(kind: MetricKind, value: number): string {
  const digits = kind === 'trips' || value >= 100 ? 0 : 1;
  return `${formatNumber(value, digits)} ${metricUnit(kind, value)}`;
}

export function startOfWeek(now = new Date()): Date {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
}
