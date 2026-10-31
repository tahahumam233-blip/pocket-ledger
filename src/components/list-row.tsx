import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/design';

import { AppText } from './app-text';
import { Icon } from './icon';
import { PressableScale } from './pressable-scale';

type ListRowProps = {
  title: string;
  subtitle?: string;
  leading?: ReactNode;
  trailing?: ReactNode;
  onPress?: () => void;
  chevron?: boolean;
  destructive?: boolean;
  first?: boolean;
  last?: boolean;
  testID?: string;
};

/** A settings-style row; group several inside a Card with padded={false}. */
export function ListRow({
  title,
  subtitle,
  leading,
  trailing,
  onPress,
  chevron = Boolean(onPress),
  destructive = false,
  last = false,
  testID,
}: ListRowProps) {
  const theme = useTheme();
  const content = (
    <View
      style={[
        styles.row,
        {
          paddingHorizontal: theme.spacing.lg,
          paddingVertical: theme.spacing.md,
          borderBottomColor: theme.colors.border,
          borderBottomWidth: last ? 0 : StyleSheet.hairlineWidth,
        },
      ]}
    >
      {leading ? <View style={styles.leading}>{leading}</View> : null}
      <View style={styles.text}>
        <AppText variant="bodyMedium" tone={destructive ? 'danger' : 'text'} numberOfLines={1}>
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="caption" tone="muted" numberOfLines={2}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {trailing ? <View style={styles.trailing}>{trailing}</View> : null}
      {chevron ? <Icon name="chevron-forward" size={18} color={theme.colors.textSubtle} /> : null}
    </View>
  );
  if (!onPress) return content;
  return (
    <PressableScale
      onPress={onPress}
      scaleTo={0.995}
      accessibilityRole="button"
      testID={testID}
      pressedStyle={{ backgroundColor: theme.colors.surfaceMuted }}
    >
      {content}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 56,
  },
  leading: {
    marginRight: 2,
  },
  text: {
    flex: 1,
    gap: 2,
  },
  trailing: {
    alignItems: 'flex-end',
  },
});
