import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';

export type IoniconName = ComponentProps<typeof Ionicons>['name'];

const glyphs = Ionicons.glyphMap as Record<string, number>;

/** Resolves a stored icon key to a valid Ionicons glyph, falling back safely. */
export function iconName(name: string, outline = false): IoniconName {
  const candidate = outline ? `${name}-outline` : name;
  if (glyphs[candidate] !== undefined) return candidate as IoniconName;
  if (glyphs[name] !== undefined) return name as IoniconName;
  return (outline ? 'ellipse-outline' : 'ellipse') as IoniconName;
}

type IconProps = {
  name: string;
  size?: number;
  color: string;
  outline?: boolean;
};

export function Icon({ name, size = 20, color, outline = false }: IconProps) {
  return <Ionicons name={iconName(name, outline)} size={size} color={color} />;
}
