import { createContext, type PropsWithChildren, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';

import type { ThemePreference } from '@/application/settings';

import { type AppTheme, themes } from './tokens';

const ThemeContext = createContext<AppTheme>(themes.light);

export function AppThemeProvider({
  preference,
  children,
}: PropsWithChildren<{ preference: ThemePreference }>) {
  const systemScheme = useColorScheme();
  const theme = useMemo(() => {
    const scheme =
      preference === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : preference;
    return themes[scheme];
  }, [preference, systemScheme]);
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useTheme(): AppTheme {
  return useContext(ThemeContext);
}
