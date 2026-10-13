import type { Challenge, Goal } from '@/types';
import { METRIC_KINDS, METRIC_META } from '@/lib/metrics';

export const DEFAULT_GOALS: Goal[] = METRIC_KINDS.map((kind) => ({
  id: kind,
  kind,
  target: METRIC_META[kind].defaultTarget,
}));

// Демо-команды: очки растут по дням с заданной скоростью, чтобы рейтинг был живым без сервера.
export const CHALLENGES: Challenge[] = [
  {
    id: 'car-free-week',
    metric: 'trips',
    period: 'week',
    target: 60,
    teams: [
      { id: 'sneakers', members: 6, dailyRate: 8.2 },
      { id: 'velodvor', members: 5, dailyRate: 7.4 },
      { id: 'tram', members: 7, dailyRate: 6.9 },
      { id: 'tailwind', members: 4, dailyRate: 5.1 },
    ],
  },
  {
    id: 'active-500',
    metric: 'activeKm',
    period: 'month',
    target: 500,
    teams: [
      { id: 'velodvor', members: 5, dailyRate: 17.5 },
      { id: 'tailwind', members: 4, dailyRate: 14.8 },
      { id: 'quiet', members: 8, dailyRate: 13.2 },
      { id: 'sneakers', members: 6, dailyRate: 11.6 },
      { id: 'tram', members: 7, dailyRate: 6.3 },
    ],
  },
  {
    id: 'minus-50',
    metric: 'co2',
    period: 'month',
    target: 50,
    teams: [
      { id: 'tram', members: 7, dailyRate: 1.9 },
      { id: 'quiet', members: 8, dailyRate: 1.7 },
      { id: 'sneakers', members: 6, dailyRate: 1.4 },
      { id: 'velodvor', members: 5, dailyRate: 1.2 },
    ],
  },
];
