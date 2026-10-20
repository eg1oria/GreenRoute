import * as Location from 'expo-location';

import type { Place } from '@/types';

import { reverseGeocode } from './geocoding';

const LAST_KNOWN_MAX_AGE_MS = 60_000;
const LAST_KNOWN_ACCURACY_M = 200;

export class LocationDeniedError extends Error {}

export async function hasLocationPermission(): Promise<boolean> {
  const { granted } = await Location.getForegroundPermissionsAsync();
  return granted;
}

/** Запрашивает доступ (если нужно) и возвращает текущее положение как точку маршрута. */
export async function getCurrentPlace(): Promise<Place> {
  const { granted } = await Location.requestForegroundPermissionsAsync();
  if (!granted) throw new LocationDeniedError();

  // Свежая сохранённая позиция приходит сразу, а новое определение на Android может занять несколько секунд
  const position =
    (await Location.getLastKnownPositionAsync({ maxAge: LAST_KNOWN_MAX_AGE_MS, requiredAccuracy: LAST_KNOWN_ACCURACY_M })) ??
    (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }));
  const coord = { latitude: position.coords.latitude, longitude: position.coords.longitude };
  const address = await reverseGeocode(coord).catch(() => undefined);
  return { id: 'me', name: '', subtitle: address?.name, coord };
}
