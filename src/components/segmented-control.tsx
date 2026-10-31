import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/design';

import { AppText } from './app-text';
import { PressableScale } from './pressable-scale';

type Option<T extends string> = { value: T; label: string; color?: string };

type SegmentedControlProps<T extends string> = {
  options: readonly Option<T>[];
  value: T;
  onChange: (value: T) => void;
  size?: 'sm' | 'md';
};

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  size = 'md',
}: SegmentedControlProps<T>) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.track,
        {
          backgroundColor: theme.colors.surfaceMuted,
          borderRadius: theme.radii.lg,
          padding: 4,
        },
      ]}
      accessibilityRole="tablist"
    >
      {options.map((option) => {
        const selected = option.value === value;
        const accent = option.color ?? theme.colors.primary;
        return (
          <PressableScale
            key={option.value}
            onPress={() => onChange(option.value)}
            haptic
            scaleTo={0.98}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            style={[
              styles.segment,
              {
                borderRadius: theme.radii.md,
                backgroundColor: selected ? theme.colors.surface : 'transparent',
                paddingVertical: size === 'sm' ? 6 : 10,
                shadowColor: theme.colors.shadow,
              },
              selected && !theme.isDark ? styles.selectedShadow : null,
            ]}
          >
            <AppText
              variant={size === 'sm' ? 'labelStrong' : 'bodyStrong'}
              color={selected ? accent : theme.colors.textMuted}
            >
              {option.label}
            </AppText>
          </PressableScale>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedShadow: {
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
});
