import Ionicons from '@expo/vector-icons/Ionicons';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import type { IconName } from '@/lib/modes';
import { useTheme } from '@/theme/useTheme';

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
  sectionTitle: { fontSize: 18, fontWeight: '700', marginTop: 8 },
  screenTitle: { gap: 4, marginBottom: 4 },
  screenTitleText: { fontSize: 30, fontWeight: '800', letterSpacing: -0.5 },
  screenSubtitle: { fontSize: 15, lineHeight: 20 },
});
