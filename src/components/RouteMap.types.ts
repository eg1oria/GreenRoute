import type { LatLng, Mode, Place, RouteOption } from '@/types';

export type RouteMapProps = {
  from: Place | null;
  to: Place | null;
  routes: RouteOption[];
  selected: Mode | null;
  /** высота панели поиска поверх карты — маршрут не должен под неё попадать */
  topInset: number;
  showsUserLocation: boolean;
  onSelect: (mode: Mode) => void;
  onLongPress?: (coord: LatLng) => void;
};
