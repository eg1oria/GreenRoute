import type { LatLng, Mode, Place, RouteOption } from '@/types';

export type RouteMapProps = {
  from: Place | null;
  to: Place | null;
  routes: RouteOption[];
  selected: Mode | null;
  /** высота панели поиска поверх карты — маршрут не должен под неё попадать */
  topInset: number;
  /** высота раскрытой нижней панели — маршрут вписывается в карту над ней */
  bottomInset: number;
  /** полоса внизу карты, закрытая всегда: заголовок свёрнутой панели */
  peekInset: number;
  /** Новый объект — заново вписать точки в карту; bottomInset — сколько низа карты закрыто сейчас */
  fitRequest?: { bottomInset: number };
  showsUserLocation: boolean;
  onSelect: (mode: Mode) => void;
  /** пользователь коснулся карты или двигает её */
  onInteract?: () => void;
  /** name — название объекта, если карта его знает */
  onPress?: (coord: LatLng, name?: string) => void;
  onLongPress?: (coord: LatLng) => void;
};
