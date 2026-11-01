import { View } from 'react-native';

import { useTheme, withAlpha } from '@/design';

import { AppText } from './app-text';

type PersonAvatarProps = {
  name: string;
  color: string;
  size?: number;
};

/** A round badge with the person's initials. */
export function PersonAvatar({ name, color, size = 44 }: PersonAvatarProps) {
  const theme = useTheme();
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: withAlpha(color, theme.isDark ? 0.3 : 0.16),
        alignItems: 'center',
        justifyContent: 'center',
      }}
      accessibilityElementsHidden
      importantForAccessibility="no"
    >
      <AppText
        variant={size >= 56 ? 'heading' : 'labelStrong'}
        color={color}
        style={{ fontSize: Math.round(size * 0.38), lineHeight: Math.round(size * 0.46) }}
      >
        {initials || '?'}
      </AppText>
    </View>
  );
}
