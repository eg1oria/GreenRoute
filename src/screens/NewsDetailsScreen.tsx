import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getAnnouncement, getCachedAnnouncements, isAbortError } from '@/api/announcements';
import { Text } from '@/components/Text';
import { TranslationStatus } from '@/components/TranslationStatus';
import { Button, Card } from '@/components/ui';
import { useTranslatedTexts } from '@/hooks/useTranslatedTexts';
import { useStrings } from '@/i18n';
import { useSettings } from '@/store/Settings';
import { useTheme } from '@/theme/useTheme';
import type { Announcement } from '@/types/announcement';

const NOT_FOUND = 'HTTP 404';

export default function NewsDetailsScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const s = useStrings();
  const { language } = useSettings();
  // Маршрут передаёт только id — само объявление экран запрашивает сам
  const { id } = useLocalSearchParams<{ id: string }>();
  const announcementId = Number(id);
  const validId = Number.isInteger(announcementId) && announcementId > 0;

  const [item, setItem] = useState<Announcement | null>(null);
  const [loading, setLoading] = useState(validId);
  const [error, setError] = useState<string | null>(null);
  const [fromCache, setFromCache] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!validId) return;
    const controller = new AbortController();
    getAnnouncement(announcementId, controller.signal)
      .then((data) => {
        setItem(data);
        setFromCache(false);
      })
      .catch(async (e) => {
        if (isAbortError(e)) return;
        const cached = (await getCachedAnnouncements()).find((saved) => saved.id === announcementId);
        if (controller.signal.aborted) return;
        if (cached) {
          setItem(cached);
          setFromCache(true);
        } else {
          setError(e instanceof Error ? e.message : String(e));
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [announcementId, validId, attempt]);

  const retry = () => {
    setError(null);
    setLoading(true);
    setAttempt((n) => n + 1);
  };

  const sources = useMemo(() => (item ? [item.title, item.body] : []), [item]);
  const translation = useTranslatedTexts(sources, language);
  const [title, body] = translation.texts;

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: t.background }]}>
        <ActivityIndicator size="large" color={t.primary} />
      </View>
    );
  }

  if (!validId || error === NOT_FOUND) {
    return (
      <View style={[styles.center, { backgroundColor: t.background }]}>
        <Text style={[styles.message, { color: t.textSecondary }]}>{s.news.notFound}</Text>
      </View>
    );
  }

  if (error || !item) {
    return (
      <View style={[styles.center, { backgroundColor: t.background }]}>
        <Ionicons name="cloud-offline-outline" size={48} color={t.textSecondary} />
        <Text style={[styles.errorTitle, { color: t.text }]}>{s.news.loadError}</Text>
        {error && <Text style={[styles.message, { color: t.textSecondary }]}>{error}</Text>}
        <Button title={s.common.retry} icon="refresh" onPress={retry} style={styles.retry} />
      </View>
    );
  }

  return (
    <ScrollView
      style={{ backgroundColor: t.background }}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}>
      {fromCache && (
        <View style={[styles.banner, { backgroundColor: t.achievementSoft }]}>
          <Ionicons name="cloud-offline-outline" size={18} color={t.text} />
          <Text style={[styles.bannerText, { color: t.text }]}>{s.news.offlineCache}</Text>
        </View>
      )}
      <Text style={[styles.title, { color: t.text }]}>{title}</Text>
      <View style={[styles.author, { backgroundColor: t.accentSoft }]}>
        <Ionicons name="person-circle-outline" size={18} color={t.primary} />
        <Text style={[styles.authorText, { color: t.text }]}>{s.news.author(item.userId)}</Text>
      </View>
      <TranslationStatus {...translation} />
      <Card>
        <Text style={[styles.body, { color: t.text }]}>{body}</Text>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 8 },
  errorTitle: { fontSize: 18, fontWeight: '700', textAlign: 'center', marginTop: 4 },
  message: { fontSize: 15, textAlign: 'center' },
  retry: { marginTop: 12, width: '100%', maxWidth: 360 },
  content: { padding: 16, gap: 12 },
  banner: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, padding: 12 },
  bannerText: { flex: 1, fontSize: 14 },
  title: { fontSize: 26, fontWeight: '800', letterSpacing: -0.4 },
  author: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  authorText: { fontSize: 13, fontWeight: '600' },
  body: { fontSize: 16, lineHeight: 24 },
});
