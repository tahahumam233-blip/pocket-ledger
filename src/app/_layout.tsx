import 'react-native-gesture-handler';

import {
  DarkTheme,
  DefaultTheme,
  Stack,
  ThemeProvider,
  type ErrorBoundaryProps,
} from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';

import { ApplicationErrorFallback } from '@/components/application-error-fallback';
import { useAppTheme } from '@/hooks/use-app-theme';

export function ErrorBoundary({ retry }: ErrorBoundaryProps) {
  return <ApplicationErrorFallback onRetry={() => void retry()} />;
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const theme = useAppTheme();
  const baseNavigationTheme = colorScheme === 'dark' ? DarkTheme : DefaultTheme;
  const navigationTheme = {
    ...baseNavigationTheme,
    colors: {
      ...baseNavigationTheme.colors,
      primary: theme.colors.primary,
      background: theme.colors.background,
      card: theme.colors.surface,
      text: theme.colors.text,
      border: theme.colors.border,
      notification: theme.colors.negative,
    },
  };

  return (
    <ThemeProvider value={navigationTheme}>
      <StatusBar style={theme.isDark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="add-transaction" options={{ presentation: 'modal' }} />
      </Stack>
    </ThemeProvider>
  );
}
