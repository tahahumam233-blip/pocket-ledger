import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/design';
import {
  compareYearMonth,
  currentYearMonth,
  monthLabel,
  shiftYearMonth,
  type YearMonth,
} from '@/domain';

import { AppText } from './app-text';
import { Icon } from './icon';
import { PressableScale } from './pressable-scale';

type MonthSwitcherProps = {
  value: YearMonth;
  onChange: (next: YearMonth) => void;
  allowFuture?: boolean;
};

export function MonthSwitcher({ value, onChange, allowFuture = false }: MonthSwitcherProps) {
  const theme = useTheme();
  const isCurrent = compareYearMonth(value, currentYearMonth()) >= 0;
  const nextDisabled = !allowFuture && isCurrent;
  const buttonStyle = {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
  };
  return (
    <View style={styles.row}>
      <PressableScale
        onPress={() => onChange(shiftYearMonth(value, -1))}
        haptic
        accessibilityRole="button"
        accessibilityLabel="Previous month"
        style={[styles.button, buttonStyle]}
      >
        <Icon name="chevron-back" size={20} color={theme.colors.text} />
      </PressableScale>
      <PressableScale
        onPress={() => onChange(currentYearMonth())}
        accessibilityRole="button"
        accessibilityLabel="Jump to this month"
        style={styles.label}
      >
        <AppText variant="subheading" align="center">
          {monthLabel(value)}
        </AppText>
        {!isCurrent ? (
          <AppText variant="caption" tone="primary" align="center">
            Tap for this month
          </AppText>
        ) : null}
      </PressableScale>
      <PressableScale
        onPress={() => onChange(shiftYearMonth(value, 1))}
        disabled={nextDisabled}
        haptic
        accessibilityRole="button"
        accessibilityLabel="Next month"
        style={[styles.button, buttonStyle]}
      >
        <Icon name="chevron-forward" size={20} color={theme.colors.text} />
      </PressableScale>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  button: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  label: {
    flex: 1,
    alignItems: 'center',
  },
});
