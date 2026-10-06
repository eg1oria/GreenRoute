export type Mode = 'walk' | 'bike' | 'transit' | 'car';

export type LatLng = { latitude: number; longitude: number };

export type Place = {
  id: string;
  name: string;
  subtitle?: string;
  coord: LatLng;
};

export type RouteOption = {
  mode: Mode;
  distanceM: number;
  durationS: number;
  co2G: number;
  path: LatLng[];
  /** true, если маршрут не получен от роутинга, а оценён расчётно */
  estimated: boolean;
};

export type Trip = {
  id: string;
  date: string;
  mode: Mode;
  distanceM: number;
  durationS: number;
  co2G: number;
  /** экономия относительно той же поездки на авто */
  savedG: number;
  fromName: string;
  toName: string;
};

export type MetricKind = 'co2' | 'activeKm' | 'trips';

export type Goal = {
  id: string;
  kind: MetricKind;
  /** цель на неделю в единицах метрики: кг, км или поездки */
  target: number;
};

export type Team = {
  id: string;
  name: string;
  members: number;
  /** прирост очков демо-команды в день */
  dailyRate: number;
};

export type Challenge = {
  id: string;
  title: string;
  description: string;
  metric: MetricKind;
  period: 'week' | 'month';
  /** цель команды за период */
  target: number;
  teams: Team[];
};

export type Membership = { teamId: string; joinedAt: string };
