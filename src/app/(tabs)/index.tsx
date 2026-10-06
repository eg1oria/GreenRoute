import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CompareBars } from '@/components/CompareBars';
import { PlaceSearch } from '@/components/PlaceSearch';
import { RouteCard } from '@/components/RouteCard';
import { RouteMap } from '@/components/RouteMap';
import { Button, Card } from '@/components/ui';
import { equivalents } from '@/lib/carbon';
import { formatCo2, plural } from '@/lib/format';
import { reverseGeocode } from '@/lib/geocoding';
import { getCurrentPlace, hasLocationPermission } from '@/lib/location';
import { MODE_META } from '@/lib/modes';
import { buildRoutes, haversineM, recommendedMode, type RoutesResult } from '@/lib/routing';
import { useAppStore } from '@/store/AppStore';
import { useTheme } from '@/theme/useTheme';
import type { LatLng, Mode, Place, RouteOption } from '@/types';

type Field = 'from' | 'to';

const SEARCH_PANEL_HEIGHT = 112;
const MIN_ROUTE_M = 30;
// Один и тот же пустой массив — чтобы карта не перецентрировалась на каждый рендер
const NO_ROUTES: RouteOption[] = [];

export default function RouteScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { height } = useWindowDimensions();
  const { recordTrip } = useAppStore();

  const [from, setFrom] = useState<Place | null>(null);
  const [to, setTo] = useState<Place | null>(null);
  const [searching, setSearching] = useState<Field | null>(null);
  const [response, setResponse] = useState<{ key: string; result: RoutesResult } | null>(null);
  const [selection, setSelection] = useState<{ key: string; mode: Mode } | null>(null);
  const [locationGranted, setLocationGranted] = useState(false);
  const [attempt, setAttempt] = useState(0);

  // Если доступ к геолокации уже выдан — сразу строим маршрут от текущего положения
  useEffect(() => {
    let cancelled = false;
    hasLocationPermission()
      .then((granted) => {
        if (!granted || cancelled) return;
        setLocationGranted(true);
        return getCurrentPlace().then((place) => {
          if (!cancelled) setFrom((current) => current ?? place);
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const tooClose = from && to ? haversineM(from.coord, to.coord) < MIN_ROUTE_M : false;
  const fromCoord = from?.coord;
  const toCoord = to?.coord;
  // Ключ запроса: ответ и выбор способа относятся только к той паре точек, для которой получены
  const requestKey =
    fromCoord && toCoord && !tooClose
      ? `${fromCoord.latitude},${fromCoord.longitude};${toCoord.latitude},${toCoord.longitude};${attempt}`
      : null;

  useEffect(() => {
    if (!requestKey || !fromCoord || !toCoord) return;
    const controller = new AbortController();
    buildRoutes(fromCoord, toCoord, controller.signal)
      .then((next) => setResponse({ key: requestKey, result: next }))
      .catch(() => {});
    return () => controller.abort();
  }, [requestKey, fromCoord, toCoord]);

  const result = requestKey && response?.key === requestKey ? response.result : null;
  const loading = requestKey !== null && !result;
  const routes = result?.routes ?? NO_ROUTES;
  const recommended = result ? recommendedMode(routes) : null;
  const selected = selection && selection.key === requestKey ? selection.mode : recommended;
  const setSelected = (mode: Mode) => requestKey && setSelection({ key: requestKey, mode });

  const pickPlace = (place: Place) => {
    if (searching === 'from') setFrom(place);
    else setTo(place);
    if (place.id === 'me') setLocationGranted(true);
    setSearching(null);
  };

  const swap = () => {
    setFrom(to);
    setTo(from);
  };

  // Долгое нажатие на карте ставит точку: сначала «Откуда», если она пуста, иначе «Куда»
  const dropPin = async (coord: LatLng) => {
    const fallback: Place = { id: `pin-${coord.latitude},${coord.longitude}`, name: 'Точка на карте', coord };
    const place = (await reverseGeocode(coord).catch(() => undefined)) ?? fallback;
    if (!from) setFrom(place);
    else setTo(place);
  };

  const selectedRoute = routes.find((route) => route.mode === selected);
  const carCo2G = routes.find((route) => route.mode === 'car')?.co2G ?? 0;
  const savedG = selectedRoute ? Math.max(0, carCo2G - selectedRoute.co2G) : 0;

  const record = () => {
    if (!selectedRoute || !from || !to) return;
    const trip = recordTrip(selectedRoute, carCo2G, from.name, to.name);
    router.push({ pathname: '/trip-result', params: { id: trip.id } });
  };

  const field = (key: Field, place: Place | null, placeholder: string, color: string) => (
    <Pressable accessibilityRole="button" onPress={() => setSearching(key)} style={styles.field}>
      <View style={[styles.fieldDot, { backgroundColor: color }]} />
      <Text style={[styles.fieldText, { color: place ? t.text : t.textSecondary }]} numberOfLines={1}>
        {place?.name ?? placeholder}
      </Text>
    </Pressable>
  );

  return (
    <View style={[styles.screen, { backgroundColor: t.background }]}>
      <View style={{ height: Math.round(height * 0.4) }}>
        <RouteMap
          from={from}
          to={to}
          routes={routes}
          selected={selected}
          topInset={insets.top + SEARCH_PANEL_HEIGHT}
          showsUserLocation={locationGranted}
          onSelect={setSelected}
          onLongPress={dropPin}
        />
        <View
          style={[styles.searchPanel, { top: insets.top + 8, backgroundColor: t.card, borderColor: t.border }]}>
          <View style={styles.fields}>
            {field('from', from, 'Откуда', t.accent)}
            <View style={[styles.divider, { backgroundColor: t.border }]} />
            {field('to', to, 'Куда', t.primary)}
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Поменять местами"
            onPress={swap}
            hitSlop={8}
            style={[styles.swap, { backgroundColor: t.accentSoft }]}>
            <Ionicons name="swap-vertical" size={20} color={t.text} />
          </Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {loading && (
          <View style={styles.center}>
            <ActivityIndicator color={t.primary} />
            <Text style={[styles.hint, { color: t.textSecondary }]}>Строим маршруты…</Text>
          </View>
        )}

        {!loading && !result && (
          <Card style={styles.intro}>
            <Text style={[styles.introTitle, { color: t.text }]}>
              {tooClose ? 'Точки совпадают' : 'Куда отправимся?'}
            </Text>
            <Text style={[styles.hint, { color: t.textSecondary }]}>
              {tooClose
                ? 'Выберите другую точку назначения — эта слишком близко к началу маршрута.'
                : 'Укажите, откуда и куда — сравним пеший маршрут, велосипед и транспорт по времени и углеродному следу. Точку можно поставить и долгим нажатием на карте.'}
            </Text>
          </Card>
        )}

        {result?.offline && (
          <Card style={[styles.notice, { borderColor: t.level.medium }]}>
            <Text style={[styles.noticeText, { color: t.text }]}>
              Нет связи с сервисом маршрутов — показаны примерные оценки по прямой.
            </Text>
            <Pressable accessibilityRole="button" onPress={() => setAttempt((n) => n + 1)} hitSlop={8}>
              <Text style={[styles.retry, { color: t.primary }]}>Повторить</Text>
            </Pressable>
          </Card>
        )}

        {routes.map((route) => (
          <RouteCard
            key={route.mode}
            route={route}
            carCo2G={carCo2G}
            selected={route.mode === selected}
            recommended={route.mode === recommended}
            onPress={() => setSelected(route.mode)}
          />
        ))}

        {selectedRoute && (
          <Card style={[styles.effect, { backgroundColor: t.accentSoft, borderColor: t.accent }]}>
            <Ionicons name="leaf" size={22} color={t.primary} />
            <Text style={[styles.effectText, { color: t.text }]}>
              {selectedRoute.mode === 'car'
                ? `На авто эта поездка даст ${formatCo2(selectedRoute.co2G)} CO₂ — больше, чем любой другой способ.`
                : `${MODE_META[selectedRoute.mode].how} вы сэкономите ${formatCo2(savedG)} CO₂ по сравнению с авто — ${effectEquivalent(savedG)}.`}
            </Text>
          </Card>
        )}

        {result && <CompareBars routes={routes} selected={selected} />}
      </ScrollView>

      {selectedRoute && (
        <View style={[styles.footer, { backgroundColor: t.background, borderTopColor: t.border }]}>
          <Button title="Записать поездку" icon="checkmark-circle" onPress={record} />
        </View>
      )}

      <PlaceSearch
        visible={searching !== null}
        title={searching === 'from' ? 'Откуда' : 'Куда'}
        near={from?.coord ?? to?.coord}
        onPick={pickPlace}
        onClose={() => setSearching(null)}
      />
    </View>
  );
}

function effectEquivalent(savedG: number): string {
  const { treeDays, phoneCharges } = equivalents(savedG);
  if (treeDays >= 1) {
    return `столько дерево поглощает за ${treeDays} ${plural(treeDays, ['день', 'дня', 'дней'])}`;
  }
  return `как ${phoneCharges} ${plural(phoneCharges, ['зарядка', 'зарядки', 'зарядок'])} смартфона`;
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  searchPanel: {
    position: 'absolute',
    left: 16,
    right: 16,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    paddingLeft: 14,
    paddingRight: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  fields: { flex: 1 },
  field: { height: 48, flexDirection: 'row', alignItems: 'center', gap: 10 },
  fieldDot: { width: 10, height: 10, borderRadius: 5 },
  fieldText: { flex: 1, fontSize: 16 },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: 20 },
  swap: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16, gap: 12 },
  center: { alignItems: 'center', gap: 10, paddingVertical: 32 },
  intro: { gap: 8 },
  introTitle: { fontSize: 20, fontWeight: '700' },
  hint: { fontSize: 15, lineHeight: 21 },
  notice: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1 },
  noticeText: { flex: 1, fontSize: 14, lineHeight: 19 },
  retry: { fontSize: 14, fontWeight: '700' },
  effect: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1 },
  effectText: { flex: 1, fontSize: 15, lineHeight: 21 },
  footer: { paddingHorizontal: 16, paddingVertical: 10, borderTopWidth: StyleSheet.hairlineWidth },
});
