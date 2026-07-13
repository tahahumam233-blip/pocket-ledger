import { darkColors, lightColors, type ThemeColors } from '@/design/colors';
import { layout, radii, spacing } from '@/design/spacing';
import { typography } from '@/design/typography';

export type AppTheme = {
  isDark: boolean;
  colors: ThemeColors;
  spacing: typeof spacing;
  radii: typeof radii;
  layout: typeof layout;
  typography: typeof typography;
};

export const themes: Record<'light' | 'dark', AppTheme> = {
  light: {
    isDark: false,
    colors: lightColors,
    spacing,
    radii,
    layout,
    typography,
  },
  dark: {
    isDark: true,
    colors: darkColors,
    spacing,
    radii,
    layout,
    typography,
  },
};
