import type { LatLng, Place } from '@/types';

import { CITY_BBOX, CITY_CENTER, isInCity } from './city';

const PHOTON_URL = 'https://photon.komoot.io';

type PhotonFeature = {
  geometry: { coordinates: [number, number] };
  properties: {
    osm_type?: string;
    osm_id?: number;
    name?: string;
    street?: string;
    housenumber?: string;
    district?: string;
    city?: string;
    state?: string;
    country?: string;
  };
};

function toPlace(feature: PhotonFeature): Place {
  const p = feature.properties;
  const address = [p.street, p.housenumber].filter(Boolean).join(', ');
  const name = p.name ?? (address || p.district || p.city || '');
  const subtitle = [p.name && address ? address : undefined, p.city ?? p.state, p.country]
    .filter((part) => part && part !== name)
    .join(', ');
  const [longitude, latitude] = feature.geometry.coordinates;
  return {
    id: `${p.osm_type ?? 'x'}${p.osm_id ?? `${latitude},${longitude}`}`,
    name,
    subtitle: subtitle || undefined,
    coord: { latitude, longitude },
  };
}

async function request(path: string, signal?: AbortSignal): Promise<Place[]> {
  const response = await fetch(`${PHOTON_URL}${path}`, { signal });
  if (!response.ok) throw new Error(`Photon ${response.status}`);
  const data = await response.json();
  const places: Place[] = (data?.features ?? []).map(toPlace);
  return places.filter((place, i) => places.findIndex((other) => other.id === place.id) === i);
}

/** Ищет рядом с near; по умолчанию и пока near в городе — только в пределах города. */
export function searchPlaces(query: string, near: LatLng = CITY_CENTER, signal?: AbortSignal): Promise<Place[]> {
  const bias = `&lat=${near.latitude}&lon=${near.longitude}`;
  const bounds = isInCity(near) ? `&bbox=${CITY_BBOX}` : '';
  return request(`/api/?q=${encodeURIComponent(query)}&limit=7&lang=default${bias}${bounds}`, signal);
}

export async function reverseGeocode(coord: LatLng, signal?: AbortSignal): Promise<Place | undefined> {
  const [place] = await request(`/reverse?lat=${coord.latitude}&lon=${coord.longitude}&lang=default`, signal);
  return place && { ...place, coord };
}
