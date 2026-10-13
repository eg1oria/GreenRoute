import type { LatLng } from '@/types';

/** Алматы: центр карты, пока точки не выбраны, и приоритет в подсказках адресов */
export const CITY_CENTER: LatLng = { latitude: 43.24, longitude: 76.915 };

/** Полуразмер области в градусах, которую карта показывает, пока точки не выбраны */
export const CITY_VIEW_MARGIN_DEG = 0.035;

/** Город с пригородами */
const CITY_BOUNDS = { minLatitude: 43.05, maxLatitude: 43.45, minLongitude: 76.65, maxLongitude: 77.2 };

export const CITY_BBOX = [
  CITY_BOUNDS.minLongitude,
  CITY_BOUNDS.minLatitude,
  CITY_BOUNDS.maxLongitude,
  CITY_BOUNDS.maxLatitude,
].join(',');

export function isInCity(point: LatLng): boolean {
  return (
    point.latitude >= CITY_BOUNDS.minLatitude &&
    point.latitude <= CITY_BOUNDS.maxLatitude &&
    point.longitude >= CITY_BOUNDS.minLongitude &&
    point.longitude <= CITY_BOUNDS.maxLongitude
  );
}
