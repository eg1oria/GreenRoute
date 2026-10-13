import type { ComponentProps } from 'react';
import { StyleSheet, Text as RNText, TextInput as RNTextInput, type StyleProp, type TextStyle } from 'react-native';

import { useSettings } from '@/store/Settings';

// Размер по умолчанию у Text в React Native
const BASE_FONT_SIZE = 14;

function useScaledStyle(style: StyleProp<TextStyle>): TextStyle {
  const { fontScale } = useSettings();
  const flat = StyleSheet.flatten(style) ?? {};
  return {
    ...flat,
    fontSize: (flat.fontSize ?? BASE_FONT_SIZE) * fontScale,
    ...(flat.lineHeight !== undefined && { lineHeight: flat.lineHeight * fontScale }),
  };
}

/** Text из React Native, размер которого следует настройке «Размер шрифта» */
export function Text({ style, ...props }: ComponentProps<typeof RNText>) {
  return <RNText {...props} style={useScaledStyle(style)} />;
}

export function TextInput({ style, ...props }: ComponentProps<typeof RNTextInput>) {
  return <RNTextInput {...props} style={useScaledStyle(style)} />;
}
