import { StyleSheet, View } from 'react-native';

import { AppText } from './app-text';
import { PressableScale } from './pressable-scale';

type SectionHeaderProps = {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
  caption?: string;
};

export function SectionHeader({ title, actionLabel, onAction, caption }: SectionHeaderProps) {
  return (
    <View style={styles.row}>
      <View style={styles.titles}>
        <AppText variant="heading">{title}</AppText>
        {caption ? (
          <AppText variant="caption" tone="muted">
            {caption}
          </AppText>
        ) : null}
      </View>
      {actionLabel && onAction ? (
        <PressableScale onPress={onAction} accessibilityRole="button" hitSlop={8}>
          <AppText variant="labelStrong" tone="primary">
            {actionLabel}
          </AppText>
        </PressableScale>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 12,
  },
  titles: {
    flex: 1,
    gap: 2,
  },
});
