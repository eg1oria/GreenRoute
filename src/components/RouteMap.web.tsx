import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Polyline } from 'react-native-svg';

import { useTheme } from '@/theme/useTheme';
import type { LatLng } from '@/types';

import type { RouteMapProps } from './RouteMap.types';

const PADDING = 32;

// react-native-maps не работает в браузере, поэтому на вебе вместо карты — схема маршрутов.
export function RouteMap({ from, to, routes, selected, topInset }: RouteMapProps) {
  const t = useTheme();
  const [size, setSize] = useState({ width: 0, height: 0 });

  const points = [from?.coord, to?.coord, ...routes.flatMap((route) => route.path)].filter((p) => p !== undefined);
  const lats = points.map((p) => p.latitude);
  const lons = points.map((p) => p.longitude);
  const minLat = Math.min(...lats);
  const maxLon = Math.max(...lons);
  const minLon = Math.min(...lons);
  const maxLat = Math.max(...lats);
  // Долгота сжимается с широтой — иначе схема будет растянута по горизонтали
  const lonScale = Math.cos(((minLat + maxLat) / 2) * (Math.PI / 180));
  const spanX = Math.max((maxLon - minLon) * lonScale, 1e-6);
  const spanY = Math.max(maxLat - minLat, 1e-6);
  const areaW = size.width - PADDING * 2;
  const areaH = size.height - topInset - PADDING * 2;
  const scale = Math.min(areaW / spanX, areaH / spanY);

  const project = (p: LatLng) => ({
    x: PADDING + (areaW - spanX * scale) / 2 + (p.longitude - minLon) * lonScale * scale,
    y: topInset + PADDING + (areaH - spanY * scale) / 2 + (maxLat - p.latitude) * scale,
  });

  const ordered = [...routes].sort((a, b) => Number(a.mode === selected) - Number(b.mode === selected));
  const ready = size.width > 0 && areaH > 0 && points.length > 0;

  return (
    <View
      style={[StyleSheet.absoluteFill, { backgroundColor: t.accentSoft }]}
      onLayout={(event) => setSize(event.nativeEvent.layout)}>
      {ready && (
        <Svg width={size.width} height={size.height}>
          {ordered.map((route) => {
            const active = route.mode === selected;
            return (
              <Polyline
                key={route.mode}
                points={route.path.map((p) => `${project(p).x},${project(p).y}`).join(' ')}
                stroke={t.mode[route.mode]}
                strokeOpacity={active ? 1 : 0.6}
                strokeWidth={active ? 6 : 3}
                strokeDasharray={route.mode === 'transit' ? '12 8' : undefined}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            );
          })}
          {from && <Circle cx={project(from.coord).x} cy={project(from.coord).y} r={8} fill={t.accent} stroke="#FFFFFF" strokeWidth={3} />}
          {to && <Circle cx={project(to.coord).x} cy={project(to.coord).y} r={8} fill={t.primary} stroke="#FFFFFF" strokeWidth={3} />}
        </Svg>
      )}
      <Text style={[styles.note, { color: t.textSecondary }]}>Схема маршрутов · карта доступна в приложении</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  note: { position: 'absolute', bottom: 8, alignSelf: 'center', fontSize: 12 },
});
