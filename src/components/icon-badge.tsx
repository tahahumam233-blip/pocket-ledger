import { View } from 'react-native';

import { useTheme, withAlpha } from '@/design';

import { Icon } from './icon';

type IconBadgeProps = {
  icon: string;
  color: string;
  size?: number;
  outline?: boolean;
  /** Solid badges put the color behind a white glyph; tinted badges use a soft wash. */
  solid?: boolean;
  square?: boolean;
};

export function IconBadge({
  icon,
  color,
  size = 44,
  outline = false,
  solid = false,
  square = false,
}: IconBadgeProps) {
  const theme = useTheme();
  const background = solid ? color : withAlpha(color, theme.isDark ? 0.22 : 0.14);
  const foreground = solid ? '#FFFFFF' : color;
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: square ? size * 0.3 : size / 2,
        backgroundColor: background,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Icon name={icon} size={Math.round(size * 0.5)} color={foreground} outline={outline} />
    </View>
  );
}
