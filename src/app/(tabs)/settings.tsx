import Ionicons from '@expo/vector-icons/Ionicons';
import Slider from '@react-native-community/slider';
import Constants from 'expo-constants';
import { useState, type ReactNode } from 'react';
// FixedText — буквы-ориентиры у ползунка: их размер не должен зависеть от настройки, которую он меняет
import { Pressable, ScrollView, StyleSheet, Text as FixedText, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/Text';
import { Card, ScreenTitle, SegmentedControl } from '@/components/ui';
import { useStrings } from '@/i18n';
import { LANGUAGES } from '@/i18n/languages';
import type { IconName } from '@/lib/modes';
import { useAppStore } from '@/store/AppStore';
import {
  DEFAULT_SETTINGS,
  FONT_SCALE_MAX,
  FONT_SCALE_MIN,
  FONT_SCALE_STEP,
  useSettings,
  type ThemeMode,
} from '@/store/Settings';
import { useTheme } from '@/theme/useTheme';

function Group({ title, children }: { title: string; children: ReactNode }) {
  const t = useTheme();
  return (
    <View style={styles.group}>
      <Text style={[styles.groupTitle, { color: t.textSecondary }]}>{title}</Text>
      <Card style={styles.groupCard}>{children}</Card>
    </View>
  );
}

function Row({ icon, label, value }: { icon: IconName; label: string; value?: string }) {
  const t = useTheme();
  return (
    <View style={styles.row}>
      <Ionicons name={icon} size={20} color={t.textSecondary} />
      <Text style={[styles.rowLabel, { color: t.text }]}>{label}</Text>
      {value !== undefined && <Text style={[styles.rowValue, { color: t.textSecondary }]}>{value}</Text>}
    </View>
  );
}

function Divider() {
  const t = useTheme();
  return <View style={[styles.divider, { backgroundColor: t.border }]} />;
}

type ActionProps = { label: string; color: string; onPress: () => void; disabled?: boolean };

function Action({ label, color, onPress, disabled }: ActionProps) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => (pressed || disabled) && styles.dimmed}>
      <Text style={[styles.action, { color }]}>{label}</Text>
    </Pressable>
  );
}

export default function SettingsScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const s = useStrings();
  const { themeMode, fontScale, language, setThemeMode, setFontScale, setLanguage, reset } = useSettings();
  const { trips, clearTrips } = useAppStore();
  // Пока ползунок двигают, меняется только пример текста; ко всему приложению размер применяется, когда его отпустили
  const [draftScale, setDraftScale] = useState<number | null>(null);
  const previewScale = draftScale ?? fontScale;
  // Text уже умножает размер на fontScale — пример доводим до значения под пальцем
  const previewRatio = previewScale / fontScale;
  const [confirmingClear, setConfirmingClear] = useState(false);

  const isDefault =
    themeMode === DEFAULT_SETTINGS.themeMode &&
    fontScale === DEFAULT_SETTINGS.fontScale &&
    language === DEFAULT_SETTINGS.language;

  const themeOptions: { value: ThemeMode; label: string; icon: IconName }[] = [
    { value: 'system', label: s.settings.themeSystem, icon: 'phone-portrait-outline' },
    { value: 'light', label: s.settings.themeLight, icon: 'sunny-outline' },
    { value: 'dark', label: s.settings.themeDark, icon: 'moon-outline' },
  ];
  // Главный зелёный на тёмной карточке читается плохо
  const actionColor = t.dark ? t.accent : t.primary;

  return (
    <ScrollView
      style={{ backgroundColor: t.background }}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 16 }]}>
      <ScreenTitle title={s.settings.title} />

      <Group title={s.settings.language}>
        <View style={styles.soloControl}>
          <SegmentedControl options={LANGUAGES} value={language} onChange={setLanguage} />
        </View>
      </Group>

      <Group title={s.settings.appearance}>
        <Row icon="contrast-outline" label={s.settings.theme} />
        <View style={styles.control}>
          <SegmentedControl options={themeOptions} value={themeMode} onChange={setThemeMode} />
        </View>
        <Divider />
        <Row icon="text-outline" label={s.settings.fontSize} value={`${Math.round(previewScale * 100)}%`} />
        <View style={styles.sliderRow}>
          <FixedText style={[styles.smallLetter, { color: t.textSecondary }]}>A</FixedText>
          <Slider
            style={styles.slider}
            accessibilityLabel={s.settings.fontSize}
            minimumValue={FONT_SCALE_MIN}
            maximumValue={FONT_SCALE_MAX}
            step={FONT_SCALE_STEP}
            value={fontScale}
            onValueChange={setDraftScale}
            onSlidingComplete={(value) => {
              setFontScale(value);
              setDraftScale(null);
            }}
            minimumTrackTintColor={t.accent}
            maximumTrackTintColor={t.border}
            thumbTintColor={t.primary}
          />
          <FixedText style={[styles.largeLetter, { color: t.textSecondary }]}>A</FixedText>
        </View>
        <Text
          style={[
            styles.preview,
            { color: t.textSecondary, fontSize: 15 * previewRatio, lineHeight: 21 * previewRatio },
          ]}>
          {s.settings.previewBody}
        </Text>
      </Group>

      <Group title={s.settings.data}>
        <Row
          icon="time-outline"
          label={s.goals.history}
          value={trips.length > 0 ? s.count.trips(trips.length) : s.settings.noTrips}
        />
        <Divider />
        {confirmingClear ? (
          <View style={styles.confirm}>
            <Text style={[styles.confirmText, { color: t.text }]}>{s.settings.clearConfirm}</Text>
            <View style={styles.confirmActions}>
              <Action label={s.common.cancel} color={t.textSecondary} onPress={() => setConfirmingClear(false)} />
              <Action
                label={s.settings.delete}
                color={t.level.high}
                onPress={() => {
                  clearTrips();
                  setConfirmingClear(false);
                }}
              />
            </View>
          </View>
        ) : (
          <View style={styles.row}>
            <Action
              label={s.settings.clearHistory}
              color={t.level.high}
              disabled={trips.length === 0}
              onPress={() => setConfirmingClear(true)}
            />
          </View>
        )}
        <Divider />
        <View style={styles.row}>
          <Action label={s.settings.reset} color={actionColor} disabled={isDefault} onPress={reset} />
        </View>
      </Group>

      <Group title={s.settings.about}>
        <Row icon="information-circle-outline" label={s.settings.version} value={Constants.expoConfig?.version ?? '—'} />
        <Divider />
        <Row icon="map-outline" label={s.settings.sources} value="OpenStreetMap" />
      </Group>
      <Text style={[styles.note, { color: t.textSecondary }]}>{s.settings.co2Note}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 32, gap: 20 },
  group: { gap: 8 },
  groupTitle: { fontSize: 13, fontWeight: '600', letterSpacing: 0.6, textTransform: 'uppercase', marginLeft: 4 },
  groupCard: { paddingVertical: 4 },
  row: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  rowLabel: { flex: 1, fontSize: 16 },
  rowValue: { fontSize: 15 },
  divider: { height: StyleSheet.hairlineWidth },
  control: { paddingBottom: 12 },
  soloControl: { paddingVertical: 12 },
  sliderRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  slider: { flex: 1, height: 40 },
  smallLetter: { fontSize: 14, fontWeight: '600' },
  largeLetter: { fontSize: 24, fontWeight: '600' },
  preview: { paddingTop: 4, paddingBottom: 12 },
  action: { fontSize: 16, fontWeight: '500' },
  dimmed: { opacity: 0.4 },
  confirm: { paddingVertical: 12, gap: 12 },
  confirmText: { fontSize: 15, lineHeight: 21 },
  confirmActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 24 },
  note: { fontSize: 13, lineHeight: 18, marginHorizontal: 4, marginTop: -8 },
});
