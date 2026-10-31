import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/design';
import { haptics } from '@/platform/haptics';

import { AppText } from './app-text';
import { Icon } from './icon';
import { PressableScale } from './pressable-scale';

type AmountKeypadProps = {
  value: string;
  onChange: (next: string) => void;
  fractionDigits: 0 | 2 | 3;
  maxIntegerDigits?: number;
};

type Key = { label: string; kind: 'digit' | 'decimal' | 'backspace' };

const KEYS: Key[][] = [
  [
    { label: '1', kind: 'digit' },
    { label: '2', kind: 'digit' },
    { label: '3', kind: 'digit' },
  ],
  [
    { label: '4', kind: 'digit' },
    { label: '5', kind: 'digit' },
    { label: '6', kind: 'digit' },
  ],
  [
    { label: '7', kind: 'digit' },
    { label: '8', kind: 'digit' },
    { label: '9', kind: 'digit' },
  ],
  [
    { label: '.', kind: 'decimal' },
    { label: '0', kind: 'digit' },
    { label: '⌫', kind: 'backspace' },
  ],
];

/** Applies a key press to a digits-and-dot draft string. */
export function applyKey(
  value: string,
  key: Key,
  fractionDigits: number,
  maxIntegerDigits = 12,
): string {
  if (key.kind === 'backspace') return value.slice(0, -1);
  if (key.kind === 'decimal') {
    if (fractionDigits === 0 || value.includes('.')) return value;
    return value.length === 0 ? '0.' : `${value}.`;
  }
  const [integerPart = '', fractionPart] = value.split('.');
  if (fractionPart !== undefined) {
    if (fractionPart.length >= fractionDigits) return value;
    return `${value}${key.label}`;
  }
  if (integerPart === '0') return key.label;
  if (integerPart.length >= maxIntegerDigits) return value;
  return `${value}${key.label}`;
}

export function AmountKeypad({
  value,
  onChange,
  fractionDigits,
  maxIntegerDigits,
}: AmountKeypadProps) {
  const theme = useTheme();
  return (
    <View style={styles.grid} accessibilityRole="keyboardkey">
      {KEYS.map((row, rowIndex) => (
        <View key={rowIndex} style={styles.row}>
          {row.map((key) => {
            const disabled = key.kind === 'decimal' && fractionDigits === 0;
            return (
              <PressableScale
                key={key.label}
                disabled={disabled}
                onPress={() => {
                  haptics.tap();
                  onChange(applyKey(value, key, fractionDigits, maxIntegerDigits));
                }}
                onLongPress={key.kind === 'backspace' ? () => onChange('') : undefined}
                scaleTo={0.94}
                accessibilityRole="button"
                accessibilityLabel={key.kind === 'backspace' ? 'Delete' : key.label}
                style={[
                  styles.key,
                  {
                    backgroundColor: theme.colors.keypadKey,
                    borderRadius: theme.radii.lg,
                    borderColor: theme.colors.border,
                  },
                ]}
                pressedStyle={{ backgroundColor: theme.colors.keypadKeyPressed }}
              >
                {key.kind === 'backspace' ? (
                  <Icon name="backspace" size={24} color={theme.colors.text} outline />
                ) : (
                  <AppText variant="heading" tone={disabled ? 'subtle' : 'text'}>
                    {key.label}
                  </AppText>
                )}
              </PressableScale>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  key: {
    flex: 1,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
});
