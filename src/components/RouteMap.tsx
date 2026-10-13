import { useEffect, useMemo, useRef } from 'react';
import { StyleSheet } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';

import { CITY_CENTER, CITY_VIEW_MARGIN_DEG } from '@/lib/city';
import { placeName, useStrings } from '@/i18n';
import { MODE_DASH } from '@/lib/modes';
import { aroundPoint } from '@/lib/routing';
import { useTheme } from '@/theme/useTheme';
import type { LatLng } from '@/types';

import type { RouteMapProps } from './RouteMap.types';

const INITIAL_REGION = {
  ...CITY_CENTER,
  latitudeDelta: CITY_VIEW_MARGIN_DEG * 2,
  longitudeDelta: CITY_VIEW_MARGIN_DEG * 2,
};

// Нажатие на линию маршрута приходит и самой карте — такие нажатия точку не ставят
const OVERLAY_PRESS_WINDOW_MS = 300;

export function RouteMap({
  from,
  to,
  routes,
  selected,
  topInset,
  bottomInset,
  peekInset,
  fitRequest,
  showsUserLocation,
  onSelect,
  onInteract,
  onPress,
  onLongPress,
}: RouteMapProps) {
  const t = useTheme();
  const s = useStrings();
  const mapRef = useRef<MapView>(null);
  const pressedCoord = useRef<LatLng | null>(null);
  const overlayPressedAt = useRef(0);
  const handledFitRequest = useRef(fitRequest);
  // Логотип и подписи карты держим над заголовком свёрнутой панели
  const mapPadding = useMemo(() => ({ top: 0, right: 0, bottom: peekInset, left: 0 }), [peekInset]);

  const press = (handler: RouteMapProps['onPress'], coord: LatLng, name?: string) => {
    pressedCoord.current = coord;
    handler?.(coord, name);
  };

  useEffect(() => {
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
    mapRef.current?.fitToCoordinates(target, {
      edgePadding: { top: topInset + 24, right: 48, bottom: bottom + 32, left: 48 },
      animated: points.length > 0,
    });
  }, [from, to, routes, topInset, bottomInset, fitRequest]);

  // Выбранный маршрут рисуем последним, чтобы он лежал поверх остальных
  const ordered = [...routes].sort((a, b) => Number(a.mode === selected) - Number(b.mode === selected));

  return (
    <MapView
      ref={mapRef}
      style={StyleSheet.absoluteFill}
      initialRegion={INITIAL_REGION}
      userInterfaceStyle={t.dark ? 'dark' : 'light'}
      mapPadding={mapPadding}
      onTouchStart={onInteract}
      onRegionChange={(_, details) => {
        if (details?.isGesture) onInteract?.();
      }}
      showsUserLocation={showsUserLocation}
      showsMyLocationButton={false}
      pitchEnabled={false}
      rotateEnabled={false}
      toolbarEnabled={false}
      onPress={(event) => {
        const { action, coordinate } = event.nativeEvent;
        // Android помечает нажатия на линии и метки через action, iOS присылает их сразу после события линии
        const onOverlay =
          (action !== undefined && action !== 'press') ||
          Date.now() - overlayPressedAt.current < OVERLAY_PRESS_WINDOW_MS;
        if (!onOverlay) press(onPress, coordinate);
      }}
      onPoiClick={(event) => press(onPress, event.nativeEvent.coordinate, event.nativeEvent.name.replace(/\s+/g, ' '))}
      onLongPress={(event) => press(onLongPress, event.nativeEvent.coordinate)}>
      {ordered.map((route) => {
        const active = route.mode === selected;
        return (
          <Polyline
            key={route.mode}
            coordinates={route.path}
            strokeColor={t.mode[route.mode] + (active ? 'FF' : '99')}
            strokeWidth={active ? 6 : 3}
            lineDashPattern={MODE_DASH[route.mode]}
            lineCap="round"
            lineJoin="round"
            zIndex={active ? 2 : 1}
            tappable
            onPress={() => {
              overlayPressedAt.current = Date.now();
              onSelect(route.mode);
            }}
          />
        );
      })}
      {from && <Marker coordinate={from.coord} title={s.common.from} description={placeName(s, from)} pinColor={t.accent} />}
      {to && <Marker coordinate={to.coord} title={s.common.to} description={placeName(s, to)} pinColor={t.primary} />}
    </MapView>
  );
}
