import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/design';
import { useToastStore } from '@/state/toast-store';

import { AppText } from './app-text';
import { Icon } from './icon';
import { PressableScale } from './pressable-scale';

/** Renders the active toast above the tab bar. Mount once in the root layout. */
export function ToastHost() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useToastStore((state) => state.current);
  const dismiss = useToastStore((state) => state.dismiss);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => dismiss(toast.id), toast.durationMs);
    return () => clearTimeout(timer);
  }, [toast, dismiss]);

  if (!toast) return null;
  const accent =
    toast.tone === 'success'
      ? theme.colors.income
      : toast.tone === 'danger'
        ? theme.colors.danger
        : theme.colors.primary;
  const icon =
    toast.tone === 'success'
      ? 'checkmark-circle'
      : toast.tone === 'danger'
        ? 'alert-circle'
        : 'information-circle';

  return (
    <View
      pointerEvents="box-none"
      style={[styles.host, { bottom: insets.bottom + theme.layout.tabBarHeight + 16 }]}
    >
      <View
        style={[
          styles.toast,
          {
            backgroundColor: theme.isDark ? theme.colors.surfaceRaised : theme.colors.text,
            borderRadius: theme.radii.lg,
            shadowColor: theme.colors.shadow,
          },
        ]}
        accessibilityLiveRegion="polite"
      >
        <Icon name={icon} size={20} color={accent} />
        <AppText
          variant="label"
          color={theme.isDark ? theme.colors.text : '#FFFFFF'}
          style={styles.message}
        >
          {toast.message}
        </AppText>
        {toast.action ? (
          <PressableScale
            onPress={() => {
              dismiss(toast.id);
              void toast.action?.onPress();
            }}
            hitSlop={8}
            accessibilityRole="button"
          >
            <AppText variant="labelStrong" color={theme.isDark ? theme.colors.primary : '#9DB8FF'}>
              {toast.action.label}
            </AppText>
          </PressableScale>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    left: 16,
    right: 16,
    alignItems: 'center',
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    maxWidth: 560,
    width: '100%',
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  message: {
    flex: 1,
  },
});
