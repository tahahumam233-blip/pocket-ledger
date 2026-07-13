import { StyleSheet, Text, type TextProps } from 'react-native';

import { typography, type TypographyVariant } from '@/design/typography';
import { useAppTheme } from '@/hooks/use-app-theme';

type AppTextProps = TextProps & {
  variant?: TypographyVariant;
  color?: 'default' | 'muted' | 'primary' | 'negative' | 'positive';
};

export function AppText({ variant = 'body', color = 'default', style, ...props }: AppTextProps) {
  const theme = useAppTheme();
  const textColor = {
    default: theme.colors.text,
    muted: theme.colors.textMuted,
    primary: theme.colors.primary,
    negative: theme.colors.negative,
    positive: theme.colors.positive,
  }[color];

  return (
    <Text {...props} style={[styles.base, typography[variant], { color: textColor }, style]} />
  );
}

const styles = StyleSheet.create({
  base: {
    flexShrink: 1,
  },
});
