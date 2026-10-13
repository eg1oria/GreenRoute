import type { LatLng, Mode, RouteOption } from '@/types';

import { co2Grams } from './carbon';
import { METRO_LINE } from './metro';

const OSRM_URL = 'https://routing.openstreetmap.de';
const OSRM_PROFILE = { walk: 'routed-foot', bike: 'routed-bike', car: 'routed-car' } as const;
type RoutedMode = keyof typeof OSRM_PROFILE;

const TIMEOUT_MS = 12000;
const MAX_PATH_POINTS = 400;

// Общественный транспорт: открытого API расписаний без ключа нет, поэтому
// оцениваем по автомаршруту — путь длиннее, плюс ожидание и подход к остановке.
const TRANSIT_DETOUR = 1.15;
const TRANSIT_SPEED_KMH = 22;
const TRANSIT_OVERHEAD_S = 8 * 60;

// Электросамокат едет по веломаршруту, но быстрее; плюс время на аренду и парковку.
const SCOOTER_SPEED_KMH = 18;
const SCOOTER_OVERHEAD_S = 2 * 60;

// Метро: пешком до ближайшей станции, поезд, пешком от станции. Скорость — с учётом остановок,
// накладные — спуск, ожидание поезда и подъём.
const METRO_SPEED_KMH = 36;
const METRO_OVERHEAD_S = 10 * 60;
// Если до станции по прямой дальше — метро не предлагаем
const METRO_MAX_WALK_M = 1500;

// Запасной расчёт по прямой, когда роутинг недоступен.
const FALLBACK_DETOUR = 1.3;
const FALLBACK_SPEED_KMH: Record<RoutedMode, number> = { walk: 4.8, bike: 15, car: 28 };

type RawRoute = Omit<RouteOption, 'mode' | 'co2G'>;

export function haversineM(a: LatLng, b: LatLng): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Углы окрестности точки — чтобы показать на карте одну точку, а не только маршрут. */
export function aroundPoint(point: LatLng, marginDeg = 0.006): LatLng[] {
  return [
    { latitude: point.latitude - marginDeg, longitude: point.longitude - marginDeg },
    { latitude: point.latitude + marginDeg, longitude: point.longitude + marginDeg },
  ];
}

function thin(path: LatLng[]): LatLng[] {
  if (path.length <= MAX_PATH_POINTS) return path;
  const step = Math.ceil(path.length / MAX_PATH_POINTS);
  const result = path.filter((_, i) => i % step === 0);
  result.push(path[path.length - 1]);
  return result;
}

async function fetchOsrm(mode: RoutedMode, from: LatLng, to: LatLng, signal: AbortSignal): Promise<RawRoute> {
  const coords = `${from.longitude},${from.latitude};${to.longitude},${to.latitude}`;
  const url = `${OSRM_URL}/${OSRM_PROFILE[mode]}/route/v1/driving/${coords}?overview=full&geometries=geojson`;

  const controller = new AbortController();
  const abort = () => controller.abort();
  signal.addEventListener('abort', abort);
  const timer = setTimeout(abort, TIMEOUT_MS);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`OSRM ${response.status}`);
    const data = await response.json();
    const route = data?.routes?.[0];
    if (data?.code !== 'Ok' || !route) throw new Error('OSRM: маршрут не найден');
    const path: LatLng[] = route.geometry.coordinates.map(([longitude, latitude]: [number, number]) => ({
      latitude,
      longitude,
    }));
    return { distanceM: route.distance, durationS: route.duration, path: thin(path), estimated: false };
  } finally {
    clearTimeout(timer);
    signal.removeEventListener('abort', abort);
  }
}

function straightLine(mode: RoutedMode, from: LatLng, to: LatLng): RawRoute {
  const distanceM = haversineM(from, to) * FALLBACK_DETOUR;
  return {
    distanceM,
    durationS: (distanceM / 1000 / FALLBACK_SPEED_KMH[mode]) * 3600,
    path: [from, to],
    estimated: true,
  };
}

/** emittingM — часть пути, на которой есть выбросы, если это не весь маршрут */
function toOption(mode: Mode, raw: RawRoute, emittingM = raw.distanceM): RouteOption {
  return { mode, ...raw, co2G: co2Grams(mode, emittingM) };
}

function nearestStation(point: LatLng) {
  const distances = METRO_LINE.map((station) => haversineM(point, station.coord));
  const distanceM = Math.min(...distances);
  return { index: distances.indexOf(distanceM), distanceM };
}

function metroRoute(from: LatLng, to: LatLng): { route: RawRoute; rideM: number } | null {
  const board = nearestStation(from);
  const exit = nearestStation(to);
  if (board.index === exit.index) return null;
  if (board.distanceM > METRO_MAX_WALK_M || exit.distanceM > METRO_MAX_WALK_M) return null;

  const stops =
    board.index < exit.index
      ? METRO_LINE.slice(board.index, exit.index + 1)
      : METRO_LINE.slice(exit.index, board.index + 1).reverse();
  const rideM = stops.slice(1).reduce((sum, stop, i) => sum + haversineM(stops[i].coord, stop.coord), 0);
  const walkM = (board.distanceM + exit.distanceM) * FALLBACK_DETOUR;

  return {
    rideM,
    route: {
      distanceM: walkM + rideM,
      durationS:
        (walkM / 1000 / FALLBACK_SPEED_KMH.walk) * 3600 + (rideM / 1000 / METRO_SPEED_KMH) * 3600 + METRO_OVERHEAD_S,
      path: [from, ...stops.map((stop) => stop.coord), to],
      estimated: true,
      metroStations: [stops[0].id, stops[stops.length - 1].id],
    },
  };
}

export type RoutesResult = {
  routes: RouteOption[];
  /** роутинг был недоступен хотя бы для одного способа — показаны оценки по прямой */
  offline: boolean;
};

export async function buildRoutes(from: LatLng, to: LatLng, signal: AbortSignal): Promise<RoutesResult> {
  const routed: RoutedMode[] = ['walk', 'bike', 'car'];
  const settled = await Promise.allSettled(routed.map((mode) => fetchOsrm(mode, from, to, signal)));
  if (signal.aborted) throw new Error('aborted');

  const [walk, bike, car] = settled.map((result, i) =>
    result.status === 'fulfilled' ? result.value : straightLine(routed[i], from, to),
  );

  const scooter: RawRoute = {
    distanceM: bike.distanceM,
    durationS: bike.durationS * (FALLBACK_SPEED_KMH.bike / SCOOTER_SPEED_KMH) + SCOOTER_OVERHEAD_S,
    path: bike.path,
    estimated: true,
  };

  // Если пешком быстрее, чем через метро, — метро не по пути
  const metro = metroRoute(from, to);
  const metroOptions =
    metro && metro.route.durationS < walk.durationS ? [toOption('metro', metro.route, metro.rideM)] : [];

  const transitDistanceM = car.distanceM * TRANSIT_DETOUR;
  const transit: RawRoute = {
    distanceM: transitDistanceM,
    durationS: (transitDistanceM / 1000 / TRANSIT_SPEED_KMH) * 3600 + TRANSIT_OVERHEAD_S,
    path: car.path,
    estimated: true,
  };

  return {
    routes: [
      toOption('walk', walk),
      toOption('bike', bike),
      toOption('scooter', scooter),
      ...metroOptions,
      toOption('transit', transit),
      toOption('car', car),
    ],
    offline: settled.some((result) => result.status === 'rejected'),
  };
}

/** Самый экологичный способ, который ещё разумен по времени. */
export function recommendedMode(routes: RouteOption[]): Mode {
  // Метро есть не для каждого маршрута
  const duration = (mode: Mode) => routes.find((route) => route.mode === mode)?.durationS ?? Infinity;
  if (duration('walk') <= 20 * 60) return 'walk';
  if (duration('bike') <= 40 * 60) return 'bike';
  // Дальше — что быстрее из метро и наземного транспорта; при равенстве метро, у него след ниже
  return duration('metro') <= duration('transit') ? 'metro' : 'transit';
}
