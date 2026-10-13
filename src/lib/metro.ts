import type { LatLng, MetroStationId } from '@/types';

export type MetroStation = { id: MetroStationId; coord: LatLng };

/** Первая линия метро Алматы, станции по порядку следования. Координаты — OpenStreetMap, названия — в src/i18n. */
export const METRO_LINE: MetroStation[] = [
  { id: 'raiymbek', coord: { latitude: 43.27111, longitude: 76.94466 } },
  { id: 'zhibek', coord: { latitude: 43.2605, longitude: 76.94603 } },
  { id: 'almaly', coord: { latitude: 43.25204, longitude: 76.94709 } },
  { id: 'abay', coord: { latitude: 43.24255, longitude: 76.94845 } },
  { id: 'baikonur', coord: { latitude: 43.24124, longitude: 76.92882 } },
  { id: 'auezov', coord: { latitude: 43.24026, longitude: 76.91702 } },
  { id: 'alatau', coord: { latitude: 43.23845, longitude: 76.89755 } },
  { id: 'sairan', coord: { latitude: 43.23662, longitude: 76.87688 } },
  { id: 'moskva', coord: { latitude: 43.23049, longitude: 76.8673 } },
  { id: 'saryarka', coord: { latitude: 43.22371, longitude: 76.85822 } },
  { id: 'momyshuly', coord: { latitude: 43.2164, longitude: 76.83784 } },
];
