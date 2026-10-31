import { StyleSheet } from 'react-native';

import { useTheme, withAlpha } from '@/design';

import { AppText } from './app-text';
import { Icon } from './icon';
import { PressableScale } from './pressable-scale';

type ChipProps = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: string;
  color?: string;
  size?: 'sm' | 'md';
};

export function Chip({ label, selected = false, onPress, icon, color, size = 'md' }: ChipProps) {
  const theme = useTheme();
  const accent = color ?? theme.colors.primary;
  const background = selected
    ? withAlpha(accent, theme.isDark ? 0.28 : 0.14)
    : theme.colors.surface;
  const text = selected ? accent : theme.colors.textMuted;
  return (
    <PressableScale
      onPress={onPress}
      disabled={!onPress}
      haptic
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={[
        styles.chip,
        {
          backgroundColor: background,
          borderColor: selected ? withAlpha(accent, 0.5) : theme.colors.border,
          paddingVertical: size === 'sm' ? 5 : 8,
          paddingHorizontal: size === 'sm' ? 10 : 14,
          borderRadius: theme.radii.pill,
        },
      ]}
    >
      {icon ? <Icon name={icon} size={size === 'sm' ? 14 : 16} color={text} outline /> : null}
      <AppText variant={size === 'sm' ? 'captionStrong' : 'labelStrong'} color={text}>
        {label}
      </AppText>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
  },
});
