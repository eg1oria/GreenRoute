import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { searchPlaces } from '@/lib/geocoding';
import { getCurrentPlace, LocationDeniedError } from '@/lib/location';
import type { IconName } from '@/lib/modes';
import { useTheme } from '@/theme/useTheme';
import type { LatLng, Place } from '@/types';

const DEBOUNCE_MS = 400;
const MIN_QUERY = 2;

type Props = {
  visible: boolean;
  title: string;
  /** подсказки ближе к этой точке показываются первыми */
  near?: LatLng;
  onPick: (place: Place) => void;
  onClose: () => void;
};

export function PlaceSearch({ visible, onClose, ...rest }: Props) {
  // Содержимое монтируется заново при каждом открытии, поэтому запрос и подсказки не «залипают»
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      {visible && <SearchBody onClose={onClose} {...rest} />}
    </Modal>
  );
}

type Response = { query: string; places: Place[]; failed: boolean };

function SearchBody({ title, near, onPick, onClose }: Omit<Props, 'visible'>) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState<Response | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationMessage, setLocationMessage] = useState<string | null>(null);

  const trimmed = query.trim();
  const active = trimmed.length >= MIN_QUERY;
  const current = active && response?.query === trimmed ? response : null;
  const results = current?.places ?? [];
  const searching = active && !current;
  const searchMessage = !current
    ? null
    : current.failed
      ? 'Не удалось загрузить подсказки. Проверьте подключение к интернету.'
      : current.places.length === 0
        ? 'Ничего не нашлось — попробуйте уточнить адрес.'
        : null;
  const message = locationMessage ?? searchMessage;

  useEffect(() => {
    if (trimmed.length < MIN_QUERY) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      searchPlaces(trimmed, near, controller.signal)
        .then((places) => setResponse({ query: trimmed, places, failed: false }))
        .catch(() => {
          if (!controller.signal.aborted) setResponse({ query: trimmed, places: [], failed: true });
        });
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [trimmed, near]);

  const pickCurrentLocation = async () => {
    setLocating(true);
    setLocationMessage(null);
    try {
      onPick(await getCurrentPlace());
    } catch (error) {
      setLocationMessage(
        error instanceof LocationDeniedError
          ? 'Нет доступа к геолокации. Разрешите его в настройках телефона или введите адрес.'
          : 'Не удалось определить местоположение. Введите адрес вручную.',
      );
    } finally {
      setLocating(false);
    }
  };

  const row = (icon: IconName, name: string, subtitle: string | undefined, onPress: () => void, busy = false) => (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.row, { borderBottomColor: t.border }, pressed && { backgroundColor: t.accentSoft }]}>
      <View style={[styles.rowIcon, { backgroundColor: t.accentSoft }]}>
        {busy ? <ActivityIndicator color={t.primary} /> : <Ionicons name={icon} size={18} color={t.primary} />}
      </View>
      <View style={styles.rowText}>
        <Text style={[styles.rowName, { color: t.text }]} numberOfLines={1}>
          {name}
        </Text>
        {subtitle && (
          <Text style={[styles.rowSubtitle, { color: t.textSecondary }]} numberOfLines={1}>
            {subtitle}
          </Text>
        )}
      </View>
    </Pressable>
  );

  return (
    <View style={[styles.screen, { backgroundColor: t.background, paddingTop: insets.top + 8 }]}>
      <View style={styles.header}>
        <View style={[styles.inputBox, { backgroundColor: t.card, borderColor: t.border }]}>
          <Ionicons name="search" size={18} color={t.textSecondary} />
          <TextInput
            autoFocus
            value={query}
            onChangeText={setQuery}
            placeholder={title}
            placeholderTextColor={t.textSecondary}
            returnKeyType="search"
            autoCorrect={false}
            style={[styles.input, { color: t.text }]}
          />
          {searching && <ActivityIndicator color={t.primary} />}
        </View>
        <Pressable accessibilityRole="button" onPress={onClose} hitSlop={12}>
          <Text style={[styles.cancel, { color: t.primary }]}>Отмена</Text>
        </Pressable>
      </View>

      <FlatList
        data={results}
        keyExtractor={(place) => place.id}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
        ListHeaderComponent={
          <>
            {row('locate', 'Моё местоположение', 'Определить по геолокации', pickCurrentLocation, locating)}
            {message && <Text style={[styles.message, { color: t.textSecondary }]}>{message}</Text>}
          </>
        }
        renderItem={({ item }) => row('location-outline', item.name, item.subtitle, () => onPick(item))}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingBottom: 8 },
  inputBox: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  input: { flex: 1, fontSize: 16, paddingVertical: 0 },
  cancel: { fontSize: 16, fontWeight: '600' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  rowText: { flex: 1, gap: 2 },
  rowName: { fontSize: 16, fontWeight: '500' },
  rowSubtitle: { fontSize: 13 },
  message: { fontSize: 14, lineHeight: 20, paddingHorizontal: 16, paddingVertical: 14 },
});
