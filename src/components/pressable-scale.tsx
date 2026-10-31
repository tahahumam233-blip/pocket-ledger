import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';

import { haptics } from '@/platform/haptics';

type Props = Omit<PressableProps, 'style'> & {
  style?: StyleProp<ViewStyle>;
  pressedStyle?: StyleProp<ViewStyle>;
  haptic?: boolean;
  scaleTo?: number;
};

/** A pressable that gently shrinks and dims while held. */
export function PressableScale({
  style,
  pressedStyle,
  haptic = false,
  scaleTo = 0.97,
  onPress,
  disabled,
  ...rest
}: Props) {
  return (
    <Pressable
      {...rest}
      disabled={disabled}
      onPress={(event) => {
        if (haptic) haptics.tap();
        onPress?.(event);
      }}
      style={({ pressed }) => [
        style,
        pressed && !disabled
          ? [{ transform: [{ scale: scaleTo }], opacity: 0.9 }, pressedStyle]
          : null,
        disabled ? { opacity: 0.5 } : null,
      ]}
    />
  );
}
