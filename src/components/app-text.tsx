import { Text, type TextProps } from 'react-native';

import { type TypographyVariant, useTheme } from '@/design';

export type TextTone =
  | 'text'
  | 'muted'
  | 'subtle'
  | 'primary'
  | 'income'
  | 'expense'
  | 'transfer'
  | 'warning'
  | 'danger'
  | 'onPrimary'
  | 'hero'
  | 'heroMuted';

export type AppTextProps = TextProps & {
  variant?: TypographyVariant;
  tone?: TextTone;
  color?: string;
  align?: 'left' | 'center' | 'right';
};

export function AppText({
  variant = 'body',
  tone = 'text',
  color,
  align,
  style,
  ...rest
}: AppTextProps) {
  const theme = useTheme();
  const tones: Record<TextTone, string> = {
    text: theme.colors.text,
    muted: theme.colors.textMuted,
    subtle: theme.colors.textSubtle,
    primary: theme.colors.primary,
    income: theme.colors.income,
    expense: theme.colors.expense,
    transfer: theme.colors.transfer,
    warning: theme.colors.warning,
    danger: theme.colors.danger,
    onPrimary: theme.colors.onPrimary,
    hero: theme.colors.heroText,
    heroMuted: theme.colors.heroTextMuted,
  };
  return (
    <Text
      {...rest}
      style={[
        theme.typography[variant],
        { color: color ?? tones[tone] },
        align ? { textAlign: align } : null,
        style,
      ]}
    />
  );
}
