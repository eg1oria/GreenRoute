import * as Location from 'expo-location';

import type { Place } from '@/types';

import { reverseGeocode } from './geocoding';

export class LocationDeniedError extends Error {}

export async function hasLocationPermission(): Promise<boolean> {
  const { granted } = await Location.getForegroundPermissionsAsync();
  return granted;
}

/** Запрашивает доступ (если нужно) и возвращает текущее положение как точку маршрута. */
export async function getCurrentPlace(): Promise<Place> {
  const { granted } = await Location.requestForegroundPermissionsAsync();
  if (!granted) throw new LocationDeniedError();

  const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
  const coord = { latitude: position.coords.latitude, longitude: position.coords.longitude };
  const address = await reverseGeocode(coord).catch(() => undefined);
  return { id: 'me', name: 'Моё местоположение', subtitle: address?.name, coord };
}
