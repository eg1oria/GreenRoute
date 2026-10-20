import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CompareBars } from '@/components/CompareBars';
import { PlaceSearch } from '@/components/PlaceSearch';
import { RouteCard } from '@/components/RouteCard';
import { RouteMap } from '@/components/RouteMap';
import { Text } from '@/components/Text';
import { Button, Card } from '@/components/ui';
import { placeName, useStrings, type Strings } from '@/i18n';
import { equivalents } from '@/lib/carbon';
import { reverseGeocode } from '@/lib/geocoding';
import { getCurrentPlace, hasLocationPermission, LocationDeniedError } from '@/lib/location';
import type { IconName } from '@/lib/modes';
import { buildRoutes, haversineM, recommendedMode, type RoutesResult } from '@/lib/routing';
import { useAppStore } from '@/store/AppStore';
import { useTheme } from '@/theme/useTheme';
import type { LatLng, Mode, Place, RouteOption } from '@/types';

type Field = 'from' | 'to';

const SEARCH_PANEL_HEIGHT = 112;
// Заголовок нижней панели — всё, что от неё остаётся, когда она свёрнута
const SHEET_PEEK_HEIGHT = 60;
const SHEET_ANIMATION_MS = 220;
// Доля высоты экрана, которую карта занимает над раскрытой панелью
const MAP_SHARE = 0.45;
const SHEET_SWIPE_MIN = 24;
const MAP_BUTTON_SIZE = 44;
const MIN_ROUTE_M = 30;
// Один и тот же пустой массив — чтобы карта не перецентрировалась на каждый рендер
const NO_ROUTES: RouteOption[] = [];

export default function RouteScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const s = useStrings();
  const { height } = useWindowDimensions();
  const { recordTrip } = useAppStore();

  const [from, setFrom] = useState<Place | null>(null);
  const [to, setTo] = useState<Place | null>(null);
  const [searching, setSearching] = useState<Field | null>(null);
  const [response, setResponse] = useState<{ key: string; result: RoutesResult } | null>(null);
  const [selection, setSelection] = useState<{ key: string; mode: Mode } | null>(null);
  const [locationGranted, setLocationGranted] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [fitRequest, setFitRequest] = useState<{ bottomInset: number }>();
  // Панель маршрутов лежит поверх карты и сворачивается, когда карту трогают
  const [sheetOpen, setSheetOpen] = useState(true);
  const [sheetHeight, setSheetHeight] = useState(0);
  // useAnimatedValue нет в react-native-web
  const [sheetCollapse] = useState(() => new Animated.Value(0));
  // Быстрый двойной тап по «Записать» не должен записать поездку дважды: следующая запись — после возврата на экран
  const recording = useRef(false);
  useFocusEffect(
    useCallback(() => {
      recording.current = false;
    }, []),
  );

  useEffect(() => {
    Animated.timing(sheetCollapse, {
      toValue: sheetOpen ? 0 : 1,
      duration: SHEET_ANIMATION_MS,
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  }, [sheetOpen, sheetCollapse]);

  // Заголовок панели можно и смахнуть: вниз — свернуть, вверх — развернуть
  const sheetSwipe = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) =>
          Math.abs(gesture.dy) > 8 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
        onPanResponderRelease: (_, gesture) => {
          if (Math.abs(gesture.dy) >= SHEET_SWIPE_MIN) setSheetOpen(gesture.dy < 0);
        },
      }),
    [],
  );

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
      .then((next) => {
        setResponse({ key: requestKey, result: next });
        // Маршруты построены — показываем их, даже если панель была свёрнута
        setSheetOpen(true);
      })
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

  const routeFromMe = async () => {
    setLocating(true);
    setLocationError(null);
    try {
      setFrom(await getCurrentPlace());
      setLocationGranted(true);
    } catch (error) {
      setLocationError(
        error instanceof LocationDeniedError ? s.route.locationDenied : s.route.locationFailed,
      );
      setSheetOpen(true);
    } finally {
      setLocating(false);
    }
  };

  // Нажатие на карте ставит «Откуда», долгое нажатие — «Куда»
  const dropPin = (key: Field, coord: LatLng, name?: string) => {
    const pin: Place = { id: `pin-${coord.latitude},${coord.longitude}`, name: name ?? '', coord };
    const setPlace = key === 'from' ? setFrom : setTo;
    setPlace(pin);
    if (name) return;
    // Точка появляется сразу, адрес подставляем, когда придёт, — если её за это время не заменили
    reverseGeocode(coord)
      .then((place) => place && setPlace((current) => (current?.id === pin.id ? place : current)))
      .catch(() => {});
  };

  const selectedRoute = routes.find((route) => route.mode === selected);
  const carCo2G = routes.find((route) => route.mode === 'car')?.co2G ?? 0;
  const savedG = selectedRoute ? Math.max(0, carCo2G - selectedRoute.co2G) : 0;

  const sheetTitle = selectedRoute
    ? `${s.mode[selectedRoute.mode].label} · ${s.format.duration(selectedRoute.durationS)}`
    : loading
      ? s.route.building
      : s.route.pickPoints;

  const record = () => {
    if (!selectedRoute || !from || !to || recording.current) return;
    recording.current = true;
    const trip = recordTrip(selectedRoute, carCo2G, placeName(s, from), placeName(s, to));
    router.push({ pathname: '/trip-result', params: { id: trip.id } });
  };

  const field = (key: Field, place: Place | null, placeholder: string, color: string) => (
    <View style={styles.fieldRow}>
      <Pressable accessibilityRole="button" onPress={() => setSearching(key)} style={styles.field}>
        <View style={[styles.fieldDot, { backgroundColor: color }]} />
        <Text style={[styles.fieldText, { color: place ? t.text : t.textSecondary }]} numberOfLines={1}>
          {place ? placeName(s, place) : placeholder}
        </Text>
      </Pressable>
      {place && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={s.route.clearField(placeholder)}
          onPress={() => (key === 'from' ? setFrom(null) : setTo(null))}
          hitSlop={10}>
          <Ionicons name="close-circle" size={20} color={t.textSecondary} />
        </Pressable>
      )}
    </View>
  );

  const sheetTranslateY = sheetCollapse.interpolate({
    inputRange: [0, 1],
    outputRange: [0, Math.max(0, sheetHeight - SHEET_PEEK_HEIGHT)],
  });

  const mapButton = (icon: IconName, label: string, onPress: () => void, busy = false) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={busy}
      onPress={onPress}
      style={[styles.mapButton, { backgroundColor: t.card, borderColor: t.border }]}>
      {busy ? <ActivityIndicator color={t.primary} /> : <Ionicons name={icon} size={22} color={t.text} />}
    </Pressable>
  );

  return (
    <View style={[styles.screen, { backgroundColor: t.background }]}>
      <RouteMap
        from={from}
        to={to}
        routes={routes}
        selected={selected}
        topInset={insets.top + SEARCH_PANEL_HEIGHT}
        bottomInset={sheetHeight}
        peekInset={SHEET_PEEK_HEIGHT}
        fitRequest={fitRequest}
        showsUserLocation={locationGranted}
        onSelect={setSelected}
        onInteract={() => setSheetOpen(false)}
        onPress={(coord, name) => dropPin('from', coord, name)}
        onLongPress={(coord) => dropPin('to', coord)}
      />
      <View style={[styles.searchPanel, { top: insets.top + 8, backgroundColor: t.card, borderColor: t.border }]}>
        <View style={styles.fields}>
          {field('from', from, s.common.from, t.accent)}
          <View style={[styles.divider, { backgroundColor: t.border }]} />
          {field('to', to, s.common.to, t.primary)}
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={s.route.swap}
          onPress={swap}
          hitSlop={8}
          style={[styles.swap, { backgroundColor: t.accentSoft }]}>
          <Ionicons name="swap-vertical" size={20} color={t.text} />
        </Pressable>
      </View>

      {/* Кнопки карты держатся над панелью и съезжают вместе с ней */}
      <Animated.View
        pointerEvents="box-none"
        style={[styles.mapButtons, { bottom: sheetHeight + 12, transform: [{ translateY: sheetTranslateY }] }]}>
        {(from || to) &&
          mapButton('scan-outline', s.route.fitRoute, () =>
            setFitRequest({ bottomInset: sheetOpen ? sheetHeight : SHEET_PEEK_HEIGHT }),
          )}
        {mapButton('locate', s.route.fromMyLocation, routeFromMe, locating)}
      </Animated.View>

      <Animated.View
        onLayout={(event) => setSheetHeight(event.nativeEvent.layout.height)}
        style={[
          styles.sheet,
          {
            top: Math.round(height * MAP_SHARE),
            backgroundColor: t.background,
            borderColor: t.border,
            transform: [{ translateY: sheetTranslateY }],
          },
        ]}>
        <View {...sheetSwipe.panHandlers}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={sheetOpen ? s.route.collapseSheet : s.route.expandSheet}
            onPress={() => setSheetOpen(!sheetOpen)}
            style={styles.sheetHeader}>
            <View style={[styles.grabber, { backgroundColor: t.border }]} />
            <View style={styles.sheetTitleRow}>
              <Text style={[styles.sheetTitle, { color: t.text }]} numberOfLines={1}>
                {sheetTitle}
              </Text>
              <Ionicons name={sheetOpen ? 'chevron-down' : 'chevron-up'} size={20} color={t.textSecondary} />
            </View>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {loading && (
            <View style={styles.center}>
              <ActivityIndicator color={t.primary} />
              <Text style={[styles.hint, { color: t.textSecondary }]}>{s.route.building}</Text>
            </View>
          )}

          {!loading && !result && (
            <Card style={styles.intro}>
              <Text style={[styles.introTitle, { color: t.text }]}>
                {tooClose ? s.route.samePoints : s.route.introTitle}
              </Text>
              <Text style={[styles.hint, { color: t.textSecondary }]}>
                {tooClose ? s.route.samePointsHint : s.route.introHint}
              </Text>
            </Card>
          )}

          {locationError && (
            <Card style={[styles.notice, { borderColor: t.level.medium }]}>
              <Text style={[styles.noticeText, { color: t.text }]}>{locationError}</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={s.route.hideMessage}
                onPress={() => setLocationError(null)}
                hitSlop={8}>
                <Ionicons name="close" size={18} color={t.textSecondary} />
              </Pressable>
            </Card>
          )}

          {result?.offline && (
            <Card style={[styles.notice, { borderColor: t.level.medium }]}>
              <Text style={[styles.noticeText, { color: t.text }]}>
                {s.route.offline}
              </Text>
              <Pressable accessibilityRole="button" onPress={() => setAttempt((n) => n + 1)} hitSlop={8}>
                <Text style={[styles.retry, { color: t.primary }]}>{s.common.retry}</Text>
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
                  ? s.route.carEffect(s.format.co2(selectedRoute.co2G))
                  : s.route.savedEffect(
                      s.mode[selectedRoute.mode].how,
                      s.format.co2(savedG),
                      effectEquivalent(s, savedG),
                    )}
              </Text>
            </Card>
          )}

          {result && <CompareBars routes={routes} selected={selected} />}
        </ScrollView>

        {selectedRoute && (
          <View style={[styles.footer, { backgroundColor: t.background, borderTopColor: t.border }]}>
            <Button title={s.route.record} icon="checkmark-circle" onPress={record} />
          </View>
        )}
      </Animated.View>

      <PlaceSearch
        visible={searching !== null}
        title={searching === 'from' ? s.common.from : s.common.to}
        near={from?.coord ?? to?.coord}
        onPick={pickPlace}
        onClose={() => setSearching(null)}
      />
    </View>
  );
}

function effectEquivalent(s: Strings, savedG: number): string | undefined {
  const { treeDays, phoneCharges } = equivalents(savedG);
  if (treeDays >= 1) return s.route.treeEquivalent(treeDays);
  // Экономия меньше одной зарядки — сравнивать не с чем
  return phoneCharges >= 1 ? s.route.phoneEquivalent(phoneCharges) : undefined;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    // Свёрнутая панель уезжает за нижний край. В браузере hidden всё равно даёт прокрутить к ней экран
    // (например, фокусом с клавиатуры), clip — нет
    overflow: Platform.OS === 'web' ? ('clip' as 'hidden') : 'hidden',
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  sheetHeader: { height: SHEET_PEEK_HEIGHT, paddingHorizontal: 16, paddingTop: 8, gap: 8 },
  grabber: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2 },
  sheetTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sheetTitle: { flex: 1, fontSize: 16, fontWeight: '700' },
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
  fieldRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  field: { flex: 1, height: 48, flexDirection: 'row', alignItems: 'center', gap: 10 },
  mapButtons: { position: 'absolute', right: 16, gap: 8 },
  mapButton: {
    width: MAP_BUTTON_SIZE,
    height: MAP_BUTTON_SIZE,
    borderRadius: MAP_BUTTON_SIZE / 2,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  fieldDot: { width: 10, height: 10, borderRadius: 5 },
  fieldText: { flex: 1, fontSize: 16 },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: 20 },
  swap: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16, paddingTop: 4, gap: 12 },
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
