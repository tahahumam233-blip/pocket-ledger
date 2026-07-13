import { APP_BRAND } from '@/config/branding';

export type ThemeColors = {
  background: string;
  surface: string;
  surfaceMuted: string;
  text: string;
  textMuted: string;
  primary: string;
  primaryPressed: string;
  onPrimary: string;
  border: string;
  tabInactive: string;
  positive: string;
  negative: string;
  warning: string;
  overlay: string;
};

export const lightColors: ThemeColors = {
  background: '#F5F8F5',
  surface: '#FFFFFF',
  surfaceMuted: '#E8EFEA',
  text: '#16221A',
  textMuted: '#5A6B60',
  primary: APP_BRAND.colors.primary,
  primaryPressed: '#165A36',
  onPrimary: '#FFFFFF',
  border: '#D4DED7',
  tabInactive: '#6D7B71',
  positive: '#1D7044',
  negative: '#AD343E',
  warning: '#9A5B13',
  overlay: 'rgba(13, 31, 20, 0.45)',
};

export const darkColors: ThemeColors = {
  background: '#0D1510',
  surface: '#16211A',
  surfaceMuted: '#202D24',
  text: '#F0F6F2',
  textMuted: '#A9B8AE',
  primary: '#70D29B',
  primaryPressed: '#8ADCAA',
  onPrimary: '#082113',
  border: '#304037',
  tabInactive: '#93A198',
  positive: '#70D29B',
  negative: '#FF9299',
  warning: '#F2BD73',
  overlay: 'rgba(0, 0, 0, 0.64)',
};
