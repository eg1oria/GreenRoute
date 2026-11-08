import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/Text';
import { Button, Card, ScreenTitle, SegmentedControl } from '@/components/ui';
import { getSavedPosts, removeSaved } from '@/database/favorites';
import type { SavedPost } from '@/database/favorites';
import { useStrings } from '@/i18n';
import { confirmDestructive } from '@/lib/dialog';
import { useTheme } from '@/theme/useTheme';

type Filter = 'all' | 'unread';

export default function FavoritesScreen() {
  const t = useTheme();
  const s = useStrings();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  // items — копия данных для экрана, постоянные данные лежат в SQLite
  const [items, setItems] = useState<SavedPost[]>([]);
  const [error, setError] = useState('');
  // loading — чтение списка, busy — изменение данных
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState<Filter>('all');
  // Блокирует одновременные операции при быстрых нажатиях: состояние busy обновляется только после перерисовки
  const locked = useRef(false);

  // При каждом возвращении на вкладку читаем базу заново — новое сохранённое объявление появляется в списке
  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      setError('');
      getSavedPosts()
        .then((rows) => {
          if (active) setItems(rows);
        })
        .catch(() => {
          if (active) setError(s.favorites.readError);
        })
        .finally(() => {
          if (active) setLoading(false);
        });
      return () => {
        active = false;
      };
    }, [s]),
  );

  const unread = useMemo(() => items.filter((item) => !item.isRead).length, [items]);
  const visible = useMemo(() => (filter === 'unread' ? items.filter((item) => !item.isRead) : items), [items, filter]);

  /** Запись может пройти успешно, а следующий SELECT завершиться ошибкой — тогда повторять изменение не нужно */
  async function reloadAfterChange() {
    try {
      setItems(await getSavedPosts());
    } catch {
      setError(s.favorites.reloadError);
    }
  }

  async function change(action: () => Promise<void>) {
    if (locked.current) return;
    locked.current = true;
    setBusy(true);
    setError('');
    try {
      await action();
    } catch {
      setError(s.favorites.changeError);
      locked.current = false;
      setBusy(false);
      return;
    }
    await reloadAfterChange();
    locked.current = false;
    setBusy(false);
  }

  function confirmRemove(id: number) {
    confirmDestructive({
      title: s.favorites.deleteTitle,
      message: s.favorites.deleteMessage,
      cancelText: s.common.cancel,
      confirmText: s.favorites.delete,
      onConfirm: () => {
        void change(() => removeSaved(id));
      },
    });
  }

  const disabled = busy || loading || !!error;

  function renderSaved({ item }: { item: SavedPost }) {
    return (
      <Card style={styles.card}>
        {/* Открытие новости отмечает её прочитанной; кнопка удаления — отдельно, а не внутри Pressable */}
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push({ pathname: '/news/[id]', params: { id: String(item.id) } })}
          style={({ pressed }) => [styles.content, pressed && styles.pressed]}>
          <View style={styles.titleRow}>
            <Text style={[styles.heading, { color: t.text }]}>{item.title}</Text>
            <Ionicons name="chevron-forward" size={20} color={t.textSecondary} />
          </View>
          <Text style={[styles.text, { color: t.text }]}>{item.body}</Text>
          <View style={styles.status}>
            <Ionicons
              name={item.isRead ? 'checkmark-circle' : 'ellipse-outline'}
              size={16}
              color={item.isRead ? t.primary : t.textSecondary}
            />
            <Text style={[styles.statusText, { color: item.isRead ? t.primary : t.textSecondary }]}>
              {item.isRead ? s.favorites.read : s.favorites.unread}
            </Text>
          </View>
        </Pressable>
        <Button
          title={s.favorites.delete}
          icon="trash-outline"
          variant="outline"
          disabled={disabled}
          onPress={() => confirmRemove(item.id)}
        />
      </Card>
    );
  }

  return (
    <FlatList
      style={{ backgroundColor: t.background }}
      contentContainerStyle={[styles.list, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 32 }]}
      data={visible}
      keyExtractor={(item) => String(item.id)}
      ListHeaderComponent={
        <View style={styles.header}>
          <ScreenTitle title={s.favorites.title} subtitle={s.favorites.subtitle} />
          <SegmentedControl<Filter>
            options={[
              { value: 'all', label: s.favorites.filterAll, icon: 'albums-outline' },
              { value: 'unread', label: s.favorites.filterUnread, icon: 'mail-unread-outline' },
            ]}
            value={filter}
            onChange={setFilter}
          />
          <Text style={[styles.counter, { color: t.textSecondary }]}>{s.favorites.unreadCount(unread)}</Text>
          {loading && <Text style={[styles.message, { color: t.textSecondary }]}>{s.favorites.loading}</Text>}
          {!!error && (
            <Text accessibilityLiveRegion="polite" style={[styles.message, { color: t.danger }]}>
              {error}
            </Text>
          )}
        </View>
      }
      ListEmptyComponent={
        !loading && !error ? (
          <Text style={[styles.message, { color: t.textSecondary }]}>
            {items.length === 0 ? s.favorites.empty : s.favorites.noUnread}
          </Text>
        ) : undefined
      }
      renderItem={renderSaved}
    />
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: 16, gap: 12 },
  header: { gap: 12, marginBottom: 4 },
  counter: { fontSize: 13 },
  message: { fontSize: 15, lineHeight: 21 },
  card: { gap: 12 },
  content: { gap: 8 },
  pressed: { opacity: 0.8 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  heading: { flex: 1, fontSize: 17, fontWeight: '700' },
  text: { fontSize: 15, lineHeight: 21 },
  status: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusText: { fontSize: 13, fontWeight: '600' },
});
