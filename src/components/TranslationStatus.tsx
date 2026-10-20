import Ionicons from '@expo/vector-icons/Ionicons';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useStrings } from '@/i18n';
import { useTheme } from '@/theme/useTheme';

import { Text } from './Text';

type Props = { translating: boolean; translated: boolean; failed: boolean };

/** Строка о машинном переводе новостей; ничего не показывает, если текст на языке оригинала */
export function TranslationStatus({ translating, translated, failed }: Props) {
  const t = useTheme();
  const s = useStrings();
  if (!translating && !translated && !failed) return null;

  const text = translating ? s.news.translating : failed ? s.news.translationFailed : s.news.machineTranslation;
  return (
    <View style={styles.row}>
      {translating ? (
        <ActivityIndicator size="small" color={t.textSecondary} />
      ) : (
        <Ionicons name={failed ? 'alert-circle-outline' : 'language-outline'} size={16} color={t.textSecondary} />
      )}
      <Text style={[styles.text, { color: t.textSecondary }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  text: { flex: 1, fontSize: 13 },
});
