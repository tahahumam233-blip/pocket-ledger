import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { Inter_700Bold } from '@expo-google-fonts/inter/700Bold';
import { useFonts } from 'expo-font';
import {
  DarkTheme,
  DefaultTheme,
  type ErrorBoundaryProps,
  Stack,
  ThemeProvider,
} from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { ConfirmHost } from '@/components/confirm-host';
import { IconBadge } from '@/components/icon-badge';
import { ToastHost } from '@/components/toast-host';
import { AppThemeProvider, themes, useTheme } from '@/design';
import { LockScreen } from '@/features/app-lock/lock-screen';
import { useAppLock } from '@/features/app-lock/use-app-lock';
import { InstallGuide } from '@/features/install/install-guide';
import {
  dismissInstallGuide,
  installGuideDismissed,
  isIosBrowserTab,
} from '@/platform/web-install';
import { useAppBoot } from '@/state/app-provider';
import { useLedgerStore } from '@/state/ledger-store';
import { useReminderSync } from '@/state/use-reminder-sync';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  return (
    <AppThemeProvider preference="system">
      <Fallback
        title="Something went wrong"
        message={error.message || 'The screen could not be shown.'}
        onRetry={() => void retry()}
      />
    </AppThemeProvider>
  );
}

function Fallback({
  title,
  message,
  onRetry,
}: {
  title: string;
  message: string;
  onRetry: () => void;
}) {
  const theme = useTheme();
  return (
    <View style={[styles.fallback, { backgroundColor: theme.colors.background }]}>
      <IconBadge icon="alert-circle" color={theme.colors.danger} size={72} outline />
      <AppText variant="heading" align="center">
        {title}
      </AppText>
      <AppText tone="muted" align="center">
        {message}
      </AppText>
      <Button label="Try again" onPress={onRetry} />
    </View>
  );
}

function RootNavigator() {
  const theme = useTheme();
  const onboardingCompleted = useLedgerStore((state) => state.settings.onboardingCompleted);
  const appLockEnabled = useLedgerStore((state) => state.settings.appLockEnabled);
  const lock = useAppLock(appLockEnabled);
  useReminderSync();

  const base = theme.isDark ? DarkTheme : DefaultTheme;
  const navigationTheme = {
    ...base,
    colors: {
      ...base.colors,
      primary: theme.colors.primary,
      background: theme.colors.background,
      card: theme.colors.surface,
      text: theme.colors.text,
      border: theme.colors.border,
      notification: theme.colors.expense,
    },
  };

  return (
    <ThemeProvider value={navigationTheme}>
      <StatusBar style={theme.isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.colors.background },
        }}
      >
        <Stack.Protected guard={!onboardingCompleted}>
          <Stack.Screen name="onboarding" options={{ gestureEnabled: false }} />
        </Stack.Protected>
        <Stack.Protected guard={onboardingCompleted}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="transaction/new" options={{ presentation: 'modal' }} />
          <Stack.Screen name="transaction/edit/[id]" options={{ presentation: 'modal' }} />
          <Stack.Screen name="transaction/[id]" />
          <Stack.Screen name="receipt/[id]" />
          <Stack.Screen name="account/[id]" />
          <Stack.Screen name="account/adjust" options={{ presentation: 'modal' }} />
          <Stack.Screen name="settings/index" />
          <Stack.Screen name="settings/currencies" />
          <Stack.Screen name="settings/reminder" />
          <Stack.Screen name="settings/accounts" />
          <Stack.Screen name="settings/account/[id]" />
          <Stack.Screen name="settings/categories" />
          <Stack.Screen name="settings/category/[id]" />
          <Stack.Screen name="settings/about" />
        </Stack.Protected>
        <Stack.Screen name="+not-found" />
      </Stack>
      {lock.locked ? (
        <LockScreen onUnlock={() => void lock.unlock()} checking={lock.checking} />
      ) : null}
    </ThemeProvider>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });
  const boot = useAppBoot();
  const themePreference = useLedgerStore((state) => state.settings.theme);
  const [showInstallGuide, setShowInstallGuide] = useState(
    () => isIosBrowserTab() && !installGuideDismissed(),
  );
  const fontsReady = fontsLoaded || Boolean(fontError);
  const ready = fontsReady && boot.status !== 'loading';

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => undefined);
  }, [ready]);

  if (!ready) return null;

  return (
    <GestureHandlerRootView style={styles.fill}>
      <SafeAreaProvider>
        <AppThemeProvider preference={themePreference}>
          {showInstallGuide ? (
            <InstallGuide
              onContinue={() => {
                dismissInstallGuide();
                setShowInstallGuide(false);
              }}
            />
          ) : boot.status === 'error' ? (
            <Fallback
              title="The ledger could not be opened"
              message={boot.message}
              onRetry={boot.retry}
            />
          ) : (
            <RootNavigator />
          )}
          <ToastHost />
          <ConfirmHost />
        </AppThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export { themes };

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  fallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 32,
  },
});
