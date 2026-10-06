import type { LatLng, Mode, RouteOption } from '@/types';

import { co2Grams } from './carbon';

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

// Запасной расчёт по прямой, когда роутинг недоступен.
const FALLBACK_DETOUR = 1.3;
const FALLBACK_SPEED_KMH: Record<RoutedMode, number> = { walk: 4.8, bike: 15, car: 28 };

type RawRoute = { distanceM: number; durationS: number; path: LatLng[]; estimated: boolean };

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

function toOption(mode: Mode, raw: RawRoute): RouteOption {
  return { mode, ...raw, co2G: co2Grams(mode, raw.distanceM) };
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

  const transitDistanceM = car.distanceM * TRANSIT_DETOUR;
  const transit: RawRoute = {
    distanceM: transitDistanceM,
    durationS: (transitDistanceM / 1000 / TRANSIT_SPEED_KMH) * 3600 + TRANSIT_OVERHEAD_S,
    path: car.path,
    estimated: true,
  };

  return {
    routes: [toOption('walk', walk), toOption('bike', bike), toOption('transit', transit), toOption('car', car)],
    offline: settled.some((result) => result.status === 'rejected'),
  };
}

/** Самый экологичный способ, который ещё разумен по времени. */
export function recommendedMode(routes: RouteOption[]): Mode {
  const byMode = Object.fromEntries(routes.map((r) => [r.mode, r])) as Record<Mode, RouteOption>;
  if (byMode.walk.durationS <= 20 * 60) return 'walk';
  if (byMode.bike.durationS <= 40 * 60) return 'bike';
  return 'transit';
}
