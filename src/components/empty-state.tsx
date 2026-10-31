import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/design';

import { AppText } from './app-text';
import { Button } from './button';
import { IconBadge } from './icon-badge';

type EmptyStateProps = {
  icon: string;
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  compact?: boolean;
};

export function EmptyState({
  icon,
  title,
  message,
  actionLabel,
  onAction,
  compact,
}: EmptyStateProps) {
  const theme = useTheme();
  return (
    <View
      style={[styles.wrap, { paddingVertical: compact ? theme.spacing.xl : theme.spacing.huge }]}
    >
      <IconBadge icon={icon} color={theme.colors.primary} size={compact ? 56 : 72} outline />
      <AppText variant={compact ? 'subheading' : 'heading'} align="center">
        {title}
      </AppText>
      <AppText tone="muted" align="center" style={styles.message}>
        {message}
      </AppText>
      {actionLabel && onAction ? (
        <Button label={actionLabel} onPress={onAction} variant="soft" style={styles.action} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 24,
  },
  message: {
    maxWidth: 320,
  },
  action: {
    marginTop: 8,
  },
});
