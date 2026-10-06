import { useEffect, useRef } from 'react';
import { StyleSheet } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';

import { useTheme } from '@/theme/useTheme';

import type { RouteMapProps } from './RouteMap.types';

// Центр Москвы — пока точки не выбраны
const INITIAL_REGION = { latitude: 55.7558, longitude: 37.6173, latitudeDelta: 0.12, longitudeDelta: 0.12 };

export function RouteMap({ from, to, routes, selected, topInset, showsUserLocation, onSelect, onLongPress }: RouteMapProps) {
  const t = useTheme();
  const mapRef = useRef<MapView>(null);

  useEffect(() => {
    const points = [from?.coord, to?.coord, ...routes.flatMap((route) => route.path)].filter((p) => p !== undefined);
    if (points.length === 0) return;
    if (points.length === 1) {
      mapRef.current?.animateToRegion({ ...points[0], latitudeDelta: 0.02, longitudeDelta: 0.02 });
      return;
    }
    mapRef.current?.fitToCoordinates(points, {
      edgePadding: { top: topInset + 24, right: 48, bottom: 48, left: 48 },
      animated: true,
    });
  }, [from, to, routes, topInset]);

  // Выбранный маршрут рисуем последним, чтобы он лежал поверх остальных
  const ordered = [...routes].sort((a, b) => Number(a.mode === selected) - Number(b.mode === selected));

  return (
    <MapView
      ref={mapRef}
      style={StyleSheet.absoluteFill}
      initialRegion={INITIAL_REGION}
      showsUserLocation={showsUserLocation}
      showsMyLocationButton={false}
      toolbarEnabled={false}
      onLongPress={(event) => onLongPress?.(event.nativeEvent.coordinate)}>
      {ordered.map((route) => {
        const active = route.mode === selected;
        return (
          <Polyline
            key={route.mode}
            coordinates={route.path}
            strokeColor={t.mode[route.mode] + (active ? 'FF' : '99')}
            strokeWidth={active ? 6 : 3}
            lineDashPattern={route.mode === 'transit' ? [12, 8] : undefined}
            lineCap="round"
            lineJoin="round"
            zIndex={active ? 2 : 1}
            tappable
            onPress={() => onSelect(route.mode)}
          />
        );
      })}
      {from && <Marker coordinate={from.coord} title="Откуда" description={from.name} pinColor={t.accent} />}
      {to && <Marker coordinate={to.coord} title="Куда" description={to.name} pinColor={t.primary} />}
    </MapView>
  );
}
