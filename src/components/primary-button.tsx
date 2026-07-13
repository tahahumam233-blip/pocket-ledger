import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { layout, radii, spacing } from '@/design/spacing';
import { useAppTheme } from '@/hooks/use-app-theme';

type PrimaryButtonProps = {
  label: string;
  onPress: () => void;
  accessibilityHint?: string;
};

export function PrimaryButton({ label, onPress, accessibilityHint }: PrimaryButtonProps) {
  const theme = useAppTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      onPress={onPress}
      style={({ pressed }) => [
        styles.pressable,
        { backgroundColor: pressed ? theme.colors.primaryPressed : theme.colors.primary },
      ]}
    >
      <View style={styles.labelContainer}>
        <AppText variant="bodyStrong" style={{ color: theme.colors.onPrimary }}>
          {label}
        </AppText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    minHeight: layout.minimumTouchTarget,
    borderRadius: radii.md,
    justifyContent: 'center',
  },
  labelContainer: {
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
});
