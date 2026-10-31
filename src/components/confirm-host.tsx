import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '@/design';
import { useConfirmStore } from '@/state/confirm-store';

import { AppText } from './app-text';
import { Button } from './button';

/** Renders confirmation dialogs requested through askConfirm on the web. Mount once. */
export function ConfirmHost() {
  const theme = useTheme();
  const current = useConfirmStore((state) => state.current);
  const settle = useConfirmStore((state) => state.settle);
  if (!current) return null;
  return (
    <Modal visible transparent animationType="fade" onRequestClose={() => settle(false)}>
      <View style={styles.root}>
        <Pressable
          style={[styles.backdrop, { backgroundColor: theme.colors.overlay }]}
          onPress={() => settle(false)}
          accessibilityRole="button"
          accessibilityLabel={current.cancelLabel ?? 'Cancel'}
        />
        <View
          style={[
            styles.dialog,
            { backgroundColor: theme.colors.surface, borderRadius: theme.radii.xxl },
          ]}
          accessibilityRole="alert"
          accessibilityViewIsModal
        >
          <AppText variant="subheading" align="center">
            {current.title}
          </AppText>
          {current.message ? (
            <AppText tone="muted" align="center">
              {current.message}
            </AppText>
          ) : null}
          <View style={styles.actions}>
            <Button
              label={current.confirmLabel ?? 'OK'}
              variant={current.destructive ? 'danger' : 'primary'}
              onPress={() => settle(true)}
              fullWidth
              testID="confirm-accept"
            />
            <Button
              label={current.cancelLabel ?? 'Cancel'}
              variant="ghost"
              onPress={() => settle(false)}
              fullWidth
              testID="confirm-cancel"
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  dialog: {
    width: '100%',
    maxWidth: 380,
    padding: 24,
    gap: 12,
  },
  actions: {
    gap: 4,
    marginTop: 8,
  },
});
