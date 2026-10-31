import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/design';
import { useReceiptUri } from '@/state/use-receipt-uri';

import { AppText } from './app-text';
import { Icon } from './icon';
import { PressableScale } from './pressable-scale';

type ReceiptThumbnailProps = {
  /** Stored receipt file name; the image is resolved through the receipt service. */
  fileName: string;
  caption?: string;
  badge?: string;
  badgeTone?: 'warning' | 'success';
  size: number;
  onPress?: () => void;
};

export function ReceiptThumbnail({
  fileName,
  caption,
  badge,
  badgeTone = 'warning',
  size,
  onPress,
}: ReceiptThumbnailProps) {
  const theme = useTheme();
  const uri = useReceiptUri(fileName);
  const badgeColor = badgeTone === 'warning' ? theme.colors.warning : theme.colors.income;
  return (
    <PressableScale
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole="imagebutton"
      accessibilityLabel={caption ? `Receipt from ${caption}` : 'Receipt'}
      style={{ width: size, gap: 6 }}
    >
      <View
        style={[
          styles.frame,
          {
            width: size,
            height: Math.round(size * 1.25),
            borderRadius: theme.radii.lg,
            backgroundColor: theme.colors.surfaceMuted,
            borderColor: theme.colors.border,
          },
        ]}
      >
        {uri ? (
          <Image
            source={{ uri }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            transition={150}
          />
        ) : (
          <Icon name="receipt" size={28} color={theme.colors.textSubtle} outline />
        )}
        {badge ? (
          <View
            style={[styles.badge, { backgroundColor: badgeColor, borderRadius: theme.radii.pill }]}
          >
            <AppText variant="micro" color="#FFFFFF">
              {badge}
            </AppText>
          </View>
        ) : null}
      </View>
      {caption ? (
        <AppText variant="caption" tone="muted" numberOfLines={1}>
          {caption}
        </AppText>
      ) : null}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  frame: {
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    left: 8,
    bottom: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
});
