import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect, useRef } from 'react';

import { CITY_CENTER, CITY_VIEW_MARGIN_DEG } from '@/lib/city';
import { placeName, useStrings } from '@/i18n';
import { MODE_DASH } from '@/lib/modes';
import { aroundPoint } from '@/lib/routing';
import { useTheme } from '@/theme/useTheme';
import type { LatLng } from '@/types';

import type { RouteMapProps } from './RouteMap.types';

const TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';
const CITY_ZOOM = 12;
const MAX_FIT_ZOOM = 17;
// Невидимая широкая линия поверх маршрута — чтобы по нему было легко попасть
const ROUTE_HIT_WIDTH = 22;
// У OpenStreetMap нет тёмных тайлов — в тёмной теме инвертируем светлые
const DARK_TILES_FILTER = 'invert(1) hue-rotate(180deg) brightness(0.9) contrast(0.9)';

const toLeaflet = (p: LatLng): L.LatLngTuple => [p.latitude, p.longitude];

// react-native-maps не работает в браузере, поэтому на вебе карта — Leaflet с тайлами OpenStreetMap.
export function RouteMap({
  from,
  to,
  routes,
  selected,
  topInset,
  bottomInset,
  fitRequest,
  onSelect,
  onInteract,
  onPress,
  onLongPress,
}: RouteMapProps) {
  const t = useTheme();
  const s = useStrings();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const overlayRef = useRef<L.LayerGroup | null>(null);
  // Карта создаётся один раз, а обработчики приходят новые на каждый рендер
  const handlersRef = useRef({ onSelect, onInteract, onPress, onLongPress });
  useEffect(() => {
    handlersRef.current = { onSelect, onInteract, onPress, onLongPress };
  });
  const pressedCoord = useRef<LatLng | null>(null);
  const handledFitRequest = useRef(fitRequest);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const map = L.map(container, { zoomControl: false, attributionControl: false }).setView(
      toLeaflet(CITY_CENTER),
      CITY_ZOOM,
    );
    L.tileLayer(TILE_URL, { attribution: ATTRIBUTION, maxZoom: 19 }).addTo(map);
    // Низ карты закрывает панель маршрутов, поэтому кнопки и подпись — сверху, под панелью поиска
    L.control.zoom({ position: 'topleft' }).addTo(map);
    L.control.attribution({ position: 'topright', prefix: '<a href="https://leafletjs.com">Leaflet</a>' }).addTo(map);
    const interact = () => handlersRef.current.onInteract?.();
    container.addEventListener('pointerdown', interact);
    const press = (handler: 'onPress' | 'onLongPress') => (event: L.LeafletMouseEvent) => {
      const coord = { latitude: event.latlng.lat, longitude: event.latlng.lng };
      pressedCoord.current = coord;
      handlersRef.current[handler]?.(coord);
    };
    map.on('click', press('onPress'));
    // Долгое нажатие на сенсорном экране, в браузере с мышью — правый клик
    map.on('contextmenu', press('onLongPress'));
    mapRef.current = map;
    overlayRef.current = L.layerGroup().addTo(map);

    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(container);
    return () => {
      observer.disconnect();
      container.removeEventListener('pointerdown', interact);
      map.remove();
      mapRef.current = null;
      overlayRef.current = null;
    };
  }, []);

  useEffect(() => {
    containerRef.current?.querySelectorAll<HTMLElement>('.leaflet-top').forEach((corner) => {
      corner.style.top = `${topInset}px`;
    });
  }, [topInset]);

  useEffect(() => {
    const tiles = mapRef.current?.getPane('tilePane');
    if (tiles) tiles.style.filter = t.dark ? DARK_TILES_FILTER : '';
  }, [t.dark]);

  useEffect(() => {
    const overlay = overlayRef.current;
    if (!overlay) return;
    overlay.clearLayers();

    // Выбранный маршрут рисуем последним, чтобы он лежал поверх остальных
    const ordered = [...routes].sort((a, b) => Number(a.mode === selected) - Number(b.mode === selected));
    for (const route of ordered) {
      const active = route.mode === selected;
      const path = route.path.map(toLeaflet);
      const select = () => handlersRef.current.onSelect(route.mode);
      L.polyline(path, {
        color: t.mode[route.mode],
        opacity: active ? 1 : 0.6,
        weight: active ? 6 : 3,
        dashArray: MODE_DASH[route.mode]?.join(' '),
        lineCap: 'round',
        lineJoin: 'round',
        // Клик по линии выбирает маршрут и не должен ставить точку на карте
        bubblingMouseEvents: false,
      })
        .on('click', select)
        .addTo(overlay);
      L.polyline(path, { opacity: 0, weight: ROUTE_HIT_WIDTH, bubblingMouseEvents: false })
        .on('click', select)
        .addTo(overlay);
    }

    const pin = (coord: LatLng, label: string, color: string) =>
      L.circleMarker(toLeaflet(coord), {
        radius: 8,
        color: '#FFFFFF',
        weight: 3,
        fillColor: color,
        fillOpacity: 1,
        bubblingMouseEvents: false,
      })
        .bindTooltip(label)
        .addTo(overlay);
    if (from) pin(from.coord, `${s.common.from}: ${placeName(s, from)}`, t.accent);
    if (to) pin(to.coord, `${s.common.to}: ${placeName(s, to)}`, t.primary);
  }, [from, to, routes, selected, t, s]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const points = [from?.coord, to?.coord, ...routes.flatMap((route) => route.path)].filter((p) => p !== undefined);
    // По кнопке вписываем в то, что видно сейчас, — в том числе над свёрнутой панелью
    const requested = fitRequest !== handledFitRequest.current;
    handledFitRequest.current = fitRequest;
    const bottom = requested && fitRequest ? fitRequest.bottomInset : bottomInset;
    // Точку поставили нажатием — она уже на экране, карту не двигаем
    if (!requested && points.length === 1 && points[0] === pressedCoord.current) return;
    // Пока точек нет — город целиком, в видимой части карты между панелями
    const target =
      points.length === 0
        ? aroundPoint(CITY_CENTER, CITY_VIEW_MARGIN_DEG)
        : points.length === 1
          ? aroundPoint(points[0])
          : points;
    map.fitBounds(L.latLngBounds(target.map(toLeaflet)), {
      paddingTopLeft: [48, topInset + 24],
      paddingBottomRight: [48, bottom + 32],
      maxZoom: MAX_FIT_ZOOM,
      animate: points.length > 0,
    });
  }, [from, to, routes, topInset, bottomInset, fitRequest]);

  // zIndex создаёт контекст наложения: слои Leaflet не перекрывают панель поиска поверх карты
  return <div ref={containerRef} style={{ position: 'absolute', inset: 0, zIndex: 0, backgroundColor: t.accentSoft }} />;
}
