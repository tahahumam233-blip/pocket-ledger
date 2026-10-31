import type { ReactNode } from 'react';
import { StyleSheet, TextInput, type TextInputProps, View } from 'react-native';

import { useTheme } from '@/design';

import { AppText } from './app-text';
import { Icon } from './icon';
import { PressableScale } from './pressable-scale';

type SelectRowProps = {
  label: string;
  value: string;
  placeholder?: string;
  icon?: string;
  iconColor?: string;
  leading?: ReactNode;
  onPress: () => void;
  last?: boolean;
};

/** A tappable row that opens a picker; shows the current choice on the right. */
export function SelectRow({
  label,
  value,
  placeholder = 'Choose',
  icon,
  iconColor,
  leading,
  onPress,
  last,
}: SelectRowProps) {
  const theme = useTheme();
  return (
    <PressableScale
      onPress={onPress}
      scaleTo={0.995}
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value || placeholder}`}
      pressedStyle={{ backgroundColor: theme.colors.surfaceMuted }}
      style={[
        styles.row,
        {
          borderBottomColor: theme.colors.border,
          borderBottomWidth: last ? 0 : StyleSheet.hairlineWidth,
        },
      ]}
    >
      {leading ??
        (icon ? (
          <Icon name={icon} size={20} color={iconColor ?? theme.colors.textMuted} outline />
        ) : null)}
      <AppText variant="label" tone="muted" style={styles.label}>
        {label}
      </AppText>
      <AppText
        variant="bodyMedium"
        tone={value ? 'text' : 'subtle'}
        numberOfLines={1}
        style={styles.value}
      >
        {value || placeholder}
      </AppText>
      <Icon name="chevron-forward" size={16} color={theme.colors.textSubtle} />
    </PressableScale>
  );
}

type InputRowProps = TextInputProps & {
  label: string;
  icon?: string;
  last?: boolean;
};

export function InputRow({ label, icon, last, style, ...rest }: InputRowProps) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.row,
        {
          borderBottomColor: theme.colors.border,
          borderBottomWidth: last ? 0 : StyleSheet.hairlineWidth,
        },
      ]}
    >
      {icon ? <Icon name={icon} size={20} color={theme.colors.textMuted} outline /> : null}
      <AppText variant="label" tone="muted" style={styles.label}>
        {label}
      </AppText>
      <TextInput
        {...rest}
        placeholderTextColor={theme.colors.textSubtle}
        style={[theme.typography.bodyMedium, styles.input, { color: theme.colors.text }, style]}
        accessibilityLabel={label}
      />
    </View>
  );
}

type FieldProps = {
  label: string;
  hint?: string;
  error?: string | null;
  children: ReactNode;
};

export function Field({ label, hint, error, children }: FieldProps) {
  return (
    <View style={styles.field}>
      <AppText variant="labelStrong">{label}</AppText>
      {children}
      {error ? (
        <AppText variant="caption" tone="danger">
          {error}
        </AppText>
      ) : hint ? (
        <AppText variant="caption" tone="muted">
          {hint}
        </AppText>
      ) : null}
    </View>
  );
}

export function TextField(props: TextInputProps) {
  const theme = useTheme();
  return (
    <TextInput
      placeholderTextColor={theme.colors.textSubtle}
      {...props}
      style={[
        theme.typography.body,
        styles.textField,
        {
          color: theme.colors.text,
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
          borderRadius: theme.radii.lg,
        },
        props.style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    minHeight: 54,
  },
  label: {
    width: 84,
  },
  value: {
    flex: 1,
    textAlign: 'right',
  },
  input: {
    flex: 1,
    textAlign: 'right',
    paddingVertical: 14,
  },
  field: {
    gap: 8,
  },
  textField: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
  },
});
