import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { APP_BRAND } from '@/config/branding';
import { layout, radii, spacing } from '@/design/spacing';
import { useAppTheme } from '@/hooks/use-app-theme';

type ApplicationErrorFallbackProps = {
  onRetry: () => void;
};

export function ApplicationErrorFallback({ onRetry }: ApplicationErrorFallbackProps) {
  const theme = useAppTheme();

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      <View style={styles.container}>
        <AppText variant="title" accessibilityRole="header">
          {APP_BRAND.name} hit a problem
        </AppText>
        <AppText color="muted">
          Your local data has not been changed. Try loading this screen again.
        </AppText>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Try again"
          onPress={onRetry}
          style={({ pressed }) => [
            styles.button,
            {
              backgroundColor: pressed ? theme.colors.primaryPressed : theme.colors.primary,
            },
          ]}
        >
          <AppText variant="bodyStrong" style={{ color: theme.colors.onPrimary }}>
            Try again
          </AppText>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    width: '100%',
    maxWidth: layout.maxContentWidth,
    alignSelf: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.lg,
  },
  button: {
    minHeight: layout.minimumTouchTarget,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
});
