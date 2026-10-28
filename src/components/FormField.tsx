import type { ComponentProps, ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme/useTheme';

import { Text, TextInput } from './Text';

type FormFieldProps = {
  label: string;
  /** сообщение проверки — выводится под полем, рядом с элементом, к которому относится */
  error?: string;
  hint?: string;
  /** справа под полем, например счётчик символов */
  aside?: string;
  children: ReactNode;
};

export function FormField({ label, error, hint, aside, children }: FormFieldProps) {
  const t = useTheme();
  const note = error ?? hint;
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: t.text }]}>{label}</Text>
      {children}
      {(note || aside) && (
        <View style={styles.noteRow}>
          <Text
            accessibilityLiveRegion={error ? 'polite' : 'none'}
            style={[styles.note, { color: error ? t.danger : t.textSecondary }]}>
            {note ?? ''}
          </Text>
          {aside && <Text style={[styles.aside, { color: t.textSecondary }]}>{aside}</Text>}
        </View>
      )}
    </View>
  );
}

type FormInputProps = ComponentProps<typeof TextInput> & { invalid?: boolean };

export function FormInput({ invalid, multiline, style, ...props }: FormInputProps) {
  const t = useTheme();
  return (
    <TextInput
      {...props}
      multiline={multiline}
      textAlignVertical={multiline ? 'top' : 'center'}
      placeholderTextColor={t.textSecondary}
      style={[
        styles.input,
        { backgroundColor: t.card, borderColor: invalid ? t.danger : t.border, color: t.text },
        multiline && styles.multiline,
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  field: { gap: 6 },
  label: { fontSize: 15, fontWeight: '700' },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16 },
  multiline: { minHeight: 110 },
  noteRow: { flexDirection: 'row', gap: 12 },
  note: { flex: 1, fontSize: 13 },
  aside: { fontSize: 13 },
});
