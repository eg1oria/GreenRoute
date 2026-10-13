export type MetroStationId =
  | 'raiymbek'
  | 'zhibek'
  | 'almaly'
  | 'abay'
  | 'baikonur'
  | 'auezov'
  | 'alatau'
  | 'sairan'
  | 'moskva'
  | 'saryarka'
  | 'momyshuly';

export type ChallengeId = 'car-free-week' | 'active-500' | 'minus-50';
export type TeamId = 'sneakers' | 'velodvor' | 'tram' | 'tailwind' | 'quiet';

export type Mode = 'walk' | 'bike' | 'scooter' | 'metro' | 'transit' | 'car';

export type LatLng = { latitude: number; longitude: number };

export type Place = {
  id: string;
  /** пусто, если своего названия нет — тогда его подставляет placeName на языке интерфейса */
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
  /** для метро: станции посадки и выхода */
  metroStations?: [MetroStationId, MetroStationId];
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

/** Названия команд и челленджей — в словарях src/i18n */
export type Team = {
  id: TeamId;
  members: number;
  /** прирост очков демо-команды в день */
  dailyRate: number;
};

export type Challenge = {
  id: ChallengeId;
  metric: MetricKind;
  period: 'week' | 'month';
  /** цель команды за период */
  target: number;
  teams: Team[];
};

export type Membership = { teamId: string; joinedAt: string };
