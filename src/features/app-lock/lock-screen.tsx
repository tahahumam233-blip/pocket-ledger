import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { IconBadge } from '@/components/icon-badge';
import brand from '@/config/brand.json';
import { useTheme } from '@/design';

type LockScreenProps = {
  onUnlock: () => void;
  checking: boolean;
};

export function LockScreen({ onUnlock, checking }: LockScreenProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        styles.root,
        {
          backgroundColor: theme.colors.background,
          paddingTop: insets.top + 40,
          paddingBottom: insets.bottom + 32,
        },
      ]}
      accessibilityViewIsModal
    >
      <View style={styles.center}>
        <IconBadge icon="lock-closed" color={theme.colors.primary} size={88} />
        <AppText variant="title" align="center">
          {brand.name} is locked
        </AppText>
        <AppText tone="muted" align="center" style={styles.copy}>
          Unlock with your face, fingerprint or device passcode to see your ledger.
        </AppText>
      </View>
      <Button
        label="Unlock"
        icon="finger-print"
        onPress={onUnlock}
        loading={checking}
        size="lg"
        fullWidth
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 28,
    justifyContent: 'space-between',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  copy: {
    maxWidth: 300,
  },
});
