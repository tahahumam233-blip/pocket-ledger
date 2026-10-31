import type { PropsWithChildren, ReactNode } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/design';

import { AppText } from './app-text';
import { Icon } from './icon';
import { PressableScale } from './pressable-scale';

type BottomSheetProps = PropsWithChildren<{
  visible: boolean;
  onClose: () => void;
  title?: string;
  right?: ReactNode;
  scroll?: boolean;
  /** Fraction of the screen height the sheet may grow to. */
  maxHeight?: number;
}>;

/** A simple slide-up sheet that works identically on iOS, Android and web. */
export function BottomSheet({
  visible,
  onClose,
  title,
  right,
  children,
  scroll = true,
  maxHeight = 0.85,
}: BottomSheetProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.root}>
        <Pressable
          style={[styles.backdrop, { backgroundColor: theme.colors.overlay }]}
          onPress={onClose}
          accessibilityLabel="Close"
          accessibilityRole="button"
        />
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: theme.colors.background,
              borderTopLeftRadius: theme.radii.xxl,
              borderTopRightRadius: theme.radii.xxl,
              paddingBottom: Math.max(insets.bottom, theme.spacing.lg),
              maxHeight: `${Math.round(maxHeight * 100)}%`,
            },
          ]}
        >
          <View style={[styles.grabber, { backgroundColor: theme.colors.borderStrong }]} />
          {title ? (
            <View style={styles.titleRow}>
              <View style={styles.titleSpacer} />
              <AppText variant="subheading" align="center" style={styles.title}>
                {title}
              </AppText>
              <View style={styles.titleSpacer}>
                {right ?? (
                  <PressableScale
                    onPress={onClose}
                    hitSlop={10}
                    accessibilityLabel="Close"
                    accessibilityRole="button"
                  >
                    <Icon name="close" size={22} color={theme.colors.textMuted} />
                  </PressableScale>
                )}
              </View>
            </View>
          ) : null}
          {scroll ? (
            <ScrollView
              contentContainerStyle={styles.content}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {children}
            </ScrollView>
          ) : (
            <View style={styles.content}>{children}</View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  sheet: {
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
    paddingTop: 8,
  },
  grabber: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    marginBottom: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  title: {
    flex: 1,
  },
  titleSpacer: {
    width: 32,
    alignItems: 'flex-end',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 8,
    gap: 12,
  },
});
