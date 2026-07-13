import { useColorScheme } from 'react-native';

import { themes } from '@/design/themes';

export function useAppTheme() {
  return useColorScheme() === 'dark' ? themes.dark : themes.light;
}
