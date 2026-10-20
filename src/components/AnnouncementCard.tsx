import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, View } from 'react-native';

import { useStrings } from '@/i18n';
import { useTheme } from '@/theme/useTheme';
import type { Announcement } from '@/types/announcement';

import { Text } from './Text';

type Props = { item: Announcement; onPress: () => void };

export function AnnouncementCard({ item, onPress }: Props) {
  const t = useTheme();
  const s = useStrings();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.card, { backgroundColor: t.card, borderColor: t.border }, pressed && styles.pressed]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: t.text }]} numberOfLines={2}>
          {item.title}
        </Text>
        <Ionicons name="chevron-forward" size={20} color={t.textSecondary} />
      </View>
      <Text style={[styles.body, { color: t.textSecondary }]} numberOfLines={2}>
        {item.body}
      </Text>
      <Text style={[styles.meta, { color: t.textSecondary }]}>{s.news.author(item.userId)}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 8 },
  pressed: { opacity: 0.8 },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  title: { flex: 1, fontSize: 17, fontWeight: '700' },
  body: { fontSize: 14, lineHeight: 20 },
  meta: { fontSize: 12, fontWeight: '600' },
});
