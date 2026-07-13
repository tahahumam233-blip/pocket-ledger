import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { radii, spacing } from '@/design/spacing';
import { useAppTheme } from '@/hooks/use-app-theme';

type FeaturePlaceholderProps = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  message: string;
  availability: string;
};

export function FeaturePlaceholder({
  icon,
  title,
  message,
  availability,
}: FeaturePlaceholderProps) {
  const theme = useAppTheme();

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
      ]}
    >
      <View style={[styles.icon, { backgroundColor: theme.colors.surfaceMuted }]}>
        <Ionicons name={icon} size={24} color={theme.colors.primary} accessibilityElementsHidden />
      </View>
      <View style={styles.copy}>
        <AppText variant="heading">{title}</AppText>
        <AppText color="muted">{message}</AppText>
        <AppText variant="caption" color="primary">
          {availability}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.lg,
    padding: spacing.lg,
    flexDirection: 'row',
    gap: spacing.md,
  },
  icon: {
    width: 48,
    height: 48,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    flex: 1,
    gap: spacing.sm,
  },
});
