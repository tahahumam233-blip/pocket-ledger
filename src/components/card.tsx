import type { PropsWithChildren } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/design';

import { PressableScale } from './pressable-scale';

type CardProps = PropsWithChildren<{
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
  muted?: boolean;
  onPress?: () => void;
  accessibilityLabel?: string;
  testID?: string;
}>;

export function Card({
  children,
  style,
  padded = true,
  muted = false,
  onPress,
  accessibilityLabel,
  testID,
}: CardProps) {
  const theme = useTheme();
  const base: StyleProp<ViewStyle> = [
    styles.card,
    {
      backgroundColor: muted ? theme.colors.surfaceMuted : theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: theme.radii.xl,
      padding: padded ? theme.spacing.lg : 0,
      shadowColor: theme.colors.shadow,
    },
    theme.isDark ? styles.darkShadow : styles.lightShadow,
    style,
  ];
  if (onPress) {
    return (
      <PressableScale
        onPress={onPress}
        style={base}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        testID={testID}
      >
        {children}
      </PressableScale>
    );
  }
  return (
    <View style={base} testID={testID}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  lightShadow: {
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  darkShadow: {
    shadowOpacity: 0,
    elevation: 0,
  },
});
