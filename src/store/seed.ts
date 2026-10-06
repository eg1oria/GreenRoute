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
    title: 'Неделя без авто',
    description: 'Команды соревнуются по числу эко-поездок: пешком, на велосипеде или на транспорте.',
    metric: 'trips',
    period: 'week',
    target: 60,
    teams: [
      { id: 'sneakers', name: 'Зелёные кроссовки', members: 6, dailyRate: 8.2 },
      { id: 'velodvor', name: 'Велодвор', members: 5, dailyRate: 7.4 },
      { id: 'tram', name: 'Трамвайчик', members: 7, dailyRate: 6.9 },
      { id: 'tailwind', name: 'Ветер в спину', members: 4, dailyRate: 5.1 },
    ],
  },
  {
    id: 'active-500',
    title: 'Активные 500 км',
    description: 'Пройти и проехать на велосипеде 500 км всей командой за месяц.',
    metric: 'activeKm',
    period: 'month',
    target: 500,
    teams: [
      { id: 'velodvor', name: 'Велодвор', members: 5, dailyRate: 17.5 },
      { id: 'tailwind', name: 'Ветер в спину', members: 4, dailyRate: 14.8 },
      { id: 'quiet', name: 'Тихий ход', members: 8, dailyRate: 13.2 },
      { id: 'sneakers', name: 'Зелёные кроссовки', members: 6, dailyRate: 11.6 },
      { id: 'tram', name: 'Трамвайчик', members: 7, dailyRate: 6.3 },
    ],
  },
  {
    id: 'minus-50',
    title: 'Минус 50 кг CO₂',
    description: 'Сэкономить 50 кг CO₂ за месяц, выбирая маршруты с низким следом вместо авто.',
    metric: 'co2',
    period: 'month',
    target: 50,
    teams: [
      { id: 'tram', name: 'Трамвайчик', members: 7, dailyRate: 1.9 },
      { id: 'quiet', name: 'Тихий ход', members: 8, dailyRate: 1.7 },
      { id: 'sneakers', name: 'Зелёные кроссовки', members: 6, dailyRate: 1.4 },
      { id: 'velodvor', name: 'Велодвор', members: 5, dailyRate: 1.2 },
    ],
  },
];
