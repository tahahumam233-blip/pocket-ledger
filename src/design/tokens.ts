import type { TextStyle } from 'react-native';

export type ThemeColors = {
  background: string;
  surface: string;
  surfaceMuted: string;
  surfaceRaised: string;
  border: string;
  borderStrong: string;
  text: string;
  textMuted: string;
  textSubtle: string;
  primary: string;
  primarySoft: string;
  onPrimary: string;
  income: string;
  incomeSoft: string;
  expense: string;
  expenseSoft: string;
  transfer: string;
  transferSoft: string;
  warning: string;
  warningSoft: string;
  danger: string;
  dangerSoft: string;
  overlay: string;
  tabBar: string;
  heroGradient: readonly [string, string, ...string[]];
  heroText: string;
  heroTextMuted: string;
  keypadKey: string;
  keypadKeyPressed: string;
  shadow: string;
};

export const lightColors: ThemeColors = {
  background: '#F4F6FB',
  surface: '#FFFFFF',
  surfaceMuted: '#EEF1F8',
  surfaceRaised: '#FFFFFF',
  border: '#E3E7F0',
  borderStrong: '#CBD2E1',
  text: '#0F172A',
  textMuted: '#5B6578',
  textSubtle: '#94A0B8',
  primary: '#1F4FD8',
  primarySoft: '#E6ECFD',
  onPrimary: '#FFFFFF',
  income: '#15803D',
  incomeSoft: '#DCFCE7',
  expense: '#DC2626',
  expenseSoft: '#FEE2E2',
  transfer: '#6D28D9',
  transferSoft: '#EDE9FE',
  warning: '#B45309',
  warningSoft: '#FEF3C7',
  danger: '#DC2626',
  dangerSoft: '#FEE2E2',
  overlay: 'rgba(15, 23, 42, 0.45)',
  tabBar: '#FFFFFF',
  heroGradient: ['#17347F', '#1F4FD8', '#3D74F2'],
  heroText: '#FFFFFF',
  heroTextMuted: 'rgba(255, 255, 255, 0.72)',
  keypadKey: '#FFFFFF',
  keypadKeyPressed: '#E6ECFD',
  shadow: '#0F172A',
};

export const darkColors: ThemeColors = {
  background: '#0B1020',
  surface: '#141A2E',
  surfaceMuted: '#1B2238',
  surfaceRaised: '#1B2238',
  border: '#252D47',
  borderStrong: '#3A4466',
  text: '#F1F5F9',
  textMuted: '#A3ADC6',
  textSubtle: '#6E7A99',
  primary: '#7C9CFF',
  primarySoft: '#1E2A55',
  onPrimary: '#0B1020',
  income: '#4ADE80',
  incomeSoft: '#15331F',
  expense: '#F87171',
  expenseSoft: '#3B1D1D',
  transfer: '#C4B5FD',
  transferSoft: '#2A2250',
  warning: '#FBBF24',
  warningSoft: '#3B2F12',
  danger: '#F87171',
  dangerSoft: '#3B1D1D',
  overlay: 'rgba(0, 0, 0, 0.62)',
  tabBar: '#111729',
  heroGradient: ['#1B2C6E', '#2A4BC0', '#3B6AE6'],
  heroText: '#FFFFFF',
  heroTextMuted: 'rgba(255, 255, 255, 0.72)',
  keypadKey: '#1B2238',
  keypadKeyPressed: '#283150',
  shadow: '#000000',
};

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 48,
} as const;

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  pill: 999,
} as const;

export const fontFamily = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
} as const;

const base = (
  fontSize: number,
  lineHeight: number,
  family: keyof typeof fontFamily,
  extra: TextStyle = {},
): TextStyle => ({ fontSize, lineHeight, fontFamily: fontFamily[family], ...extra });

export const typography = {
  display: base(36, 42, 'bold', { letterSpacing: -0.8 }),
  title: base(28, 34, 'bold', { letterSpacing: -0.5 }),
  heading: base(21, 27, 'semibold', { letterSpacing: -0.3 }),
  subheading: base(17, 22, 'semibold'),
  body: base(16, 22, 'regular'),
  bodyMedium: base(16, 22, 'medium'),
  bodyStrong: base(16, 22, 'semibold'),
  label: base(14, 18, 'medium'),
  labelStrong: base(14, 18, 'semibold'),
  caption: base(13, 18, 'regular'),
  captionStrong: base(13, 18, 'semibold'),
  micro: base(11, 14, 'semibold', { letterSpacing: 0.4, textTransform: 'uppercase' }),
  amountHero: base(44, 52, 'bold', { letterSpacing: -1.2, fontVariant: ['tabular-nums'] }),
  amountLarge: base(30, 36, 'bold', { letterSpacing: -0.6, fontVariant: ['tabular-nums'] }),
  amountMedium: base(24, 30, 'bold', { letterSpacing: -0.4, fontVariant: ['tabular-nums'] }),
  amount: base(16, 22, 'semibold', { fontVariant: ['tabular-nums'] }),
  amountSmall: base(13, 18, 'semibold', { fontVariant: ['tabular-nums'] }),
} as const;

export type TypographyVariant = keyof typeof typography;

export const layout = {
  maxContentWidth: 640,
  screenPadding: spacing.xl,
  tabBarHeight: 64,
} as const;

export type AppTheme = {
  scheme: 'light' | 'dark';
  isDark: boolean;
  colors: ThemeColors;
  spacing: typeof spacing;
  radii: typeof radii;
  typography: typeof typography;
  layout: typeof layout;
};

export const themes: Record<'light' | 'dark', AppTheme> = {
  light: {
    scheme: 'light',
    isDark: false,
    colors: lightColors,
    spacing,
    radii,
    typography,
    layout,
  },
  dark: { scheme: 'dark', isDark: true, colors: darkColors, spacing, radii, typography, layout },
};

/** Adds an alpha channel to a #RRGGBB color. */
export function withAlpha(hex: string, alpha: number): string {
  const match = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!match) return hex;
  const value = Number.parseInt(match[1] ?? '000000', 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
