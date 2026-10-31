import { ActivityIndicator, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/design';

import { AppText } from './app-text';
import { Icon } from './icon';
import { PressableScale } from './pressable-scale';

export type ButtonVariant = 'primary' | 'secondary' | 'soft' | 'ghost' | 'danger';

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: 'sm' | 'md' | 'lg';
  icon?: string;
  iconRight?: string;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  testID?: string;
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  iconRight,
  loading = false,
  disabled = false,
  fullWidth = false,
  style,
  accessibilityLabel,
  testID,
}: ButtonProps) {
  const theme = useTheme();
  const palette: Record<ButtonVariant, { background: string; text: string; border?: string }> = {
    primary: { background: theme.colors.primary, text: theme.colors.onPrimary },
    secondary: {
      background: theme.colors.surface,
      text: theme.colors.text,
      border: theme.colors.borderStrong,
    },
    soft: { background: theme.colors.primarySoft, text: theme.colors.primary },
    ghost: { background: 'transparent', text: theme.colors.primary },
    danger: { background: theme.colors.dangerSoft, text: theme.colors.danger },
  };
  const colors = palette[variant];
  const heights = { sm: 38, md: 48, lg: 56 } as const;
  const textVariant = size === 'sm' ? 'labelStrong' : 'bodyStrong';
  const iconSize = size === 'sm' ? 16 : 20;

  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled || loading}
      haptic
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      testID={testID}
      style={[
        styles.base,
        {
          height: heights[size],
          borderRadius: theme.radii.lg,
          backgroundColor: colors.background,
          borderColor: colors.border ?? 'transparent',
          borderWidth: colors.border ? 1 : 0,
          paddingHorizontal: size === 'sm' ? theme.spacing.md : theme.spacing.xl,
          alignSelf: fullWidth ? 'stretch' : 'auto',
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={colors.text} />
      ) : (
        <View style={styles.content}>
          {icon ? <Icon name={icon} size={iconSize} color={colors.text} outline /> : null}
          <AppText variant={textVariant} color={colors.text}>
            {label}
          </AppText>
          {iconRight ? <Icon name={iconRight} size={iconSize} color={colors.text} outline /> : null}
        </View>
      )}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});
