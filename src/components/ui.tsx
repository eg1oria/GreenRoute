import Ionicons from '@expo/vector-icons/Ionicons';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import type { IconName } from '@/lib/modes';
import { useSettings } from '@/store/Settings';
import { useTheme } from '@/theme/useTheme';

import { Text } from './Text';

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const t = useTheme();
  return <View style={[styles.card, { backgroundColor: t.card, borderColor: t.border }, style]}>{children}</View>;
}

type ButtonProps = {
  title: string;
  onPress: () => void;
  /** primary — только для ключевого действия экрана */
  variant?: 'primary' | 'accent' | 'outline';
  icon?: IconName;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Button({ title, onPress, variant = 'primary', icon, disabled, style }: ButtonProps) {
  const t = useTheme();
  const background = { primary: t.primary, accent: t.accent, outline: 'transparent' }[variant];
  const color = { primary: t.onPrimary, accent: t.onAccent, outline: t.text }[variant];
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: background, borderColor: variant === 'outline' ? t.border : background },
        (pressed || disabled) && styles.dimmed,
        style,
      ]}>
      {icon && <Ionicons name={icon} size={18} color={color} />}
      <Text style={[styles.buttonText, { color }]}>{title}</Text>
    </Pressable>
  );
}

export function ProgressBar({ progress, color, height = 8 }: { progress: number; color: string; height?: number }) {
  const t = useTheme();
  const percent = Math.min(1, Math.max(0, progress)) * 100;
  return (
    <View style={[styles.track, { backgroundColor: t.border, height, borderRadius: height / 2 }]}>
      <View style={{ width: `${percent}%`, height, borderRadius: height / 2, backgroundColor: color }} />
    </View>
  );
}

type SegmentedControlProps<T extends string> = {
  options: { value: T; label: string; icon?: IconName }[];
  value: T;
  onChange: (value: T) => void;
};

// Подписи сегментов растут вместе со шрифтом только до этого предела — дальше три сегмента не помещаются в ряд
const MAX_SEGMENT_SCALE = 1.1;

export function SegmentedControl<T extends string>({ options, value, onChange }: SegmentedControlProps<T>) {
  const t = useTheme();
  const { fontScale } = useSettings();
  // Text сам умножит размер на fontScale, поэтому здесь — поправка до нужного предела
  const labelSize = (14 * Math.min(fontScale, MAX_SEGMENT_SCALE)) / fontScale;
  return (
    <View role="radiogroup" style={[styles.segments, { backgroundColor: t.background, borderColor: t.border }]}>
      {options.map((option) => {
        const active = option.value === value;
        const color = active ? t.onAccent : t.textSecondary;
        return (
          <Pressable
            key={option.value}
            role="radio"
            aria-checked={active}
            onPress={() => onChange(option.value)}
            style={[styles.segment, active && { backgroundColor: t.accent }]}>
            {option.icon && <Ionicons name={option.icon} size={20} color={color} />}
            <Text style={[styles.segmentText, { color, fontSize: labelSize }]} numberOfLines={1}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function SectionTitle({ children }: { children: ReactNode }) {
  const t = useTheme();
  return <Text style={[styles.sectionTitle, { color: t.text }]}>{children}</Text>;
}

export function ScreenTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  const t = useTheme();
  return (
    <View style={styles.screenTitle}>
      <Text style={[styles.screenTitleText, { color: t.text }]}>{title}</Text>
      {subtitle && <Text style={[styles.screenSubtitle, { color: t.textSecondary }]}>{subtitle}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
  },
  button: {
    minHeight: 50,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  buttonText: { fontSize: 16, fontWeight: '600' },
  dimmed: { opacity: 0.6 },
  track: { overflow: 'hidden', alignSelf: 'stretch' },
  segments: { flexDirection: 'row', gap: 4, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, padding: 4 },
  segment: { flex: 1, minHeight: 44, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 4, alignItems: 'center', justifyContent: 'center', gap: 4 },
  segmentText: { fontWeight: '600' },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginTop: 8 },
  screenTitle: { gap: 4, marginBottom: 4 },
  screenTitleText: { fontSize: 30, fontWeight: '800', letterSpacing: -0.5 },
  screenSubtitle: { fontSize: 15, lineHeight: 20 },
});
