import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getAnnouncements, getCachedAnnouncements, isAbortError } from '@/api/announcements';
import { SOURCE_LANGUAGE, splitSentences } from '@/api/translate';
import { AnnouncementCard } from '@/components/AnnouncementCard';
import { Text, TextInput } from '@/components/Text';
import { TranslationStatus } from '@/components/TranslationStatus';
import { Button, ScreenTitle } from '@/components/ui';
import { useTranslatedTexts } from '@/hooks/useTranslatedTexts';
import { useStrings } from '@/i18n';
import { useSettings } from '@/store/Settings';
import { useTheme } from '@/theme/useTheme';
import type { Announcement } from '@/types/announcement';

export default function NewsScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const s = useStrings();
  const { language } = useSettings();

  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Сеть недоступна, на экране — последний сохранённый список
  const [fromCache, setFromCache] = useState(false);
  const [query, setQuery] = useState('');
  // Каждая попытка — новый запрос; повтор и pull-to-refresh просто увеличивают счётчик
  const [attempt, setAttempt] = useState(0);

  // Цепочка then/catch/finally вместо await: состояние меняется только в колбэках ответа,
  // а не синхронно в теле эффекта, который её вызывает
  const loadData = useCallback(
    (signal: AbortSignal) =>
      getAnnouncements(signal)
        .then((data) => {
          setItems(data);
          setFromCache(false);
        })
        .catch(async (e) => {
          if (isAbortError(e)) return;
          // Нет сети — показываем последний сохранённый список, если он есть
          const cached = await getCachedAnnouncements();
          if (signal.aborted) return;
          if (cached.length > 0) {
            setItems(cached);
            setFromCache(true);
          } else {
            setError(e instanceof Error ? e.message : String(e));
          }
        })
        .finally(() => {
          // Отменённый запрос не должен скрыть индикатор следующего, который уже идёт
          if (!signal.aborted) {
            setLoading(false);
            setRefreshing(false);
          }
        }),
    [],
  );

  useEffect(() => {
    // Уход с экрана или новая попытка отменяют незавершённый запрос
    const controller = new AbortController();
    loadData(controller.signal);
    return () => controller.abort();
  }, [loadData, attempt]);

  const onRefresh = () => {
    setError(null);
    setRefreshing(true);
    setAttempt((n) => n + 1);
  };

  const retry = () => {
    setError(null);
    setLoading(true);
    setAttempt((n) => n + 1);
  };

  // В списке переводим заголовок и первое предложение: полный текст переводится на экране новости —
  // так дневной лимит бесплатного переводчика расходуется экономнее
  const sources = useMemo(
    () =>
      items.flatMap((item) => [
        item.title,
        language === SOURCE_LANGUAGE ? item.body : splitSentences(item.body)[0],
      ]),
    [items, language],
  );
  const translation = useTranslatedTexts(sources, language);
  const shown = useMemo(
    () => items.map((item, i) => ({ ...item, title: translation.texts[2 * i], body: translation.texts[2 * i + 1] })),
    [items, translation.texts],
  );

  // Ищем по заголовку на том языке, на котором он показан
  const trimmed = query.trim().toLowerCase();
  const visible = useMemo(
    () => (trimmed ? shown.filter((item) => item.title.toLowerCase().includes(trimmed)) : shown),
    [shown, trimmed],
  );

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: t.background }]}>
        <ActivityIndicator size="large" color={t.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.center, { backgroundColor: t.background }]}>
        <Ionicons name="cloud-offline-outline" size={48} color={t.textSecondary} />
        <Text style={[styles.errorTitle, { color: t.text }]}>{s.news.loadError}</Text>
        <Text style={[styles.errorDetails, { color: t.textSecondary }]}>{error}</Text>
        <Button title={s.common.retry} icon="refresh" onPress={retry} style={styles.retry} />
      </View>
    );
  }

  return (
    <FlatList
      data={visible}
      keyExtractor={(item) => item.id.toString()}
      renderItem={({ item }) => (
        <AnnouncementCard
          item={item}
          onPress={() => router.push({ pathname: '/news/[id]', params: { id: String(item.id) } })}
        />
      )}
      refreshing={refreshing}
      onRefresh={onRefresh}
      keyboardShouldPersistTaps="handled"
      style={{ backgroundColor: t.background }}
      contentContainerStyle={[styles.list, { paddingTop: insets.top + 16 }]}
      ListHeaderComponent={
        <View style={styles.header}>
          <ScreenTitle title={s.news.title} subtitle={s.news.subtitle} />
          <View style={[styles.inputBox, { backgroundColor: t.card, borderColor: t.border }]}>
            <Ionicons name="search" size={18} color={t.textSecondary} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder={s.news.searchPlaceholder}
              placeholderTextColor={t.textSecondary}
              returnKeyType="search"
              autoCorrect={false}
              clearButtonMode="while-editing"
              keyboardAppearance={t.dark ? 'dark' : 'light'}
              style={[styles.input, { color: t.text }]}
            />
          </View>
          {fromCache && (
            <View style={[styles.banner, { backgroundColor: t.achievementSoft }]}>
              <Ionicons name="cloud-offline-outline" size={18} color={t.text} />
              <Text style={[styles.bannerText, { color: t.text }]}>{s.news.offlineCache}</Text>
            </View>
          )}
          <TranslationStatus {...translation} />
        </View>
      }
      ListEmptyComponent={
        <View style={styles.empty}>
          <Ionicons name="newspaper-outline" size={40} color={t.textSecondary} />
          <Text style={[styles.emptyText, { color: t.textSecondary }]}>
            {items.length === 0 ? s.news.empty : s.news.nothingFound(query.trim())}
          </Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 8 },
  errorTitle: { fontSize: 18, fontWeight: '700', textAlign: 'center', marginTop: 4 },
  errorDetails: { fontSize: 13, textAlign: 'center' },
  retry: { marginTop: 12, width: '100%', maxWidth: 360 },
  list: { padding: 16, paddingBottom: 32, gap: 12 },
  header: { gap: 12 },
  inputBox: {
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  input: { flex: 1, fontSize: 16, paddingVertical: 0 },
  banner: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, padding: 12 },
  bannerText: { flex: 1, fontSize: 14 },
  empty: { alignItems: 'center', gap: 8, paddingVertical: 48 },
  emptyText: { fontSize: 15, textAlign: 'center' },
});
