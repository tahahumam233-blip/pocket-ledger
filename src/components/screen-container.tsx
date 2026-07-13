import type { PropsWithChildren } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { APP_BRAND } from '@/config/branding';
import { layout, spacing } from '@/design/spacing';
import { useAppTheme } from '@/hooks/use-app-theme';

type ScreenContainerProps = PropsWithChildren<{
  title: string;
  subtitle: string;
  testID?: string;
}>;

export function ScreenContainer({ title, subtitle, testID, children }: ScreenContainerProps) {
  const theme = useAppTheme();

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        testID={testID}
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <AppText variant="label" color="primary">
              {APP_BRAND.name}
            </AppText>
            <AppText variant="display" accessibilityRole="header">
              {title}
            </AppText>
            <AppText color="muted">{subtitle}</AppText>
          </View>
          {children}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
  },
  content: {
    width: '100%',
    maxWidth: layout.maxContentWidth,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxxl,
    gap: spacing.xl,
  },
  header: {
    gap: spacing.sm,
  },
});
