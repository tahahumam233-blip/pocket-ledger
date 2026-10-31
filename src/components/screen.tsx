import { useRouter } from 'expo-router';
import type { PropsWithChildren, ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/design';

import { AppText } from './app-text';
import { Icon } from './icon';
import { PressableScale } from './pressable-scale';

type HeaderProps = {
  title?: string;
  subtitle?: string;
  eyebrow?: string;
  /** Shows a back chevron that pops the current screen. */
  back?: boolean;
  /** Shows a close button instead of a chevron (for modals). */
  close?: boolean;
  onBack?: () => void;
  right?: ReactNode;
  large?: boolean;
};

export function ScreenHeader({
  title,
  subtitle,
  eyebrow,
  back,
  close,
  onBack,
  right,
  large = false,
}: HeaderProps) {
  const theme = useTheme();
  const router = useRouter();
  const goBack = () => {
    if (onBack) return onBack();
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };
  const showNav = back || close;
  return (
    <View style={[styles.header, { paddingHorizontal: theme.layout.screenPadding }]}>
      <View style={styles.headerRow}>
        {showNav ? (
          <PressableScale
            onPress={goBack}
            accessibilityRole="button"
            accessibilityLabel={close ? 'Close' : 'Back'}
            hitSlop={10}
            style={[
              styles.navButton,
              { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
            ]}
          >
            <Icon name={close ? 'close' : 'chevron-back'} size={22} color={theme.colors.text} />
          </PressableScale>
        ) : null}
        {!large && title ? (
          <View style={styles.inlineTitle}>
            <AppText variant="subheading" numberOfLines={1} align="center">
              {title}
            </AppText>
          </View>
        ) : (
          <View style={styles.inlineTitle} />
        )}
        <View style={styles.right}>
          {right ?? (showNav ? <View style={styles.navSpacer} /> : null)}
        </View>
      </View>
      {large && title ? (
        <View style={styles.largeTitle}>
          {eyebrow ? (
            <AppText variant="micro" tone="primary">
              {eyebrow}
            </AppText>
          ) : null}
          <AppText variant="title" accessibilityRole="header">
            {title}
          </AppText>
          {subtitle ? <AppText tone="muted">{subtitle}</AppText> : null}
        </View>
      ) : null}
    </View>
  );
}

type ScreenProps = PropsWithChildren<{
  scroll?: boolean;
  header?: HeaderProps;
  contentStyle?: StyleProp<ViewStyle>;
  refreshing?: boolean;
  onRefresh?: () => void;
  /** Extra bottom padding, e.g. to clear the tab bar. */
  bottomInset?: number;
  keyboard?: boolean;
  edges?: ('top' | 'bottom')[];
  testID?: string;
}>;

export function Screen({
  children,
  scroll = true,
  header,
  contentStyle,
  refreshing = false,
  onRefresh,
  bottomInset = 0,
  keyboard = false,
  edges = ['top'],
  testID,
}: ScreenProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  // Modals and the web report no top inset; keep a little breathing room there.
  const paddingTop = edges.includes('top') ? Math.max(insets.top, 12) : 0;
  const paddingBottom = (edges.includes('bottom') ? insets.bottom : 0) + bottomInset;

  const body = (
    <View
      style={[
        styles.content,
        scroll ? null : styles.boundedContent,
        {
          maxWidth: theme.layout.maxContentWidth,
          paddingBottom: paddingBottom + theme.spacing.xxl,
        },
        contentStyle,
      ]}
    >
      {children}
    </View>
  );

  const inner = scroll ? (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      showsVerticalScrollIndicator={false}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.textMuted}
          />
        ) : undefined
      }
    >
      {header ? <ScreenHeader {...header} /> : null}
      {body}
    </ScrollView>
  ) : (
    <View style={styles.fill}>
      {header ? <ScreenHeader {...header} /> : null}
      {body}
    </View>
  );

  const wrapped = keyboard ? (
    <KeyboardAvoidingView
      style={styles.fill}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {inner}
    </KeyboardAvoidingView>
  ) : (
    inner
  );

  return (
    <View
      style={[styles.fill, { backgroundColor: theme.colors.background, paddingTop }]}
      testID={testID}
    >
      {wrapped}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
  },
  content: {
    width: '100%',
    alignSelf: 'center',
    flexGrow: 1,
    paddingHorizontal: 20,
    gap: 20,
  },
  boundedContent: {
    flex: 1,
    flexShrink: 1,
    minHeight: 0,
  },
  header: {
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
    paddingTop: 8,
    paddingBottom: 12,
    gap: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 40,
  },
  navButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  navSpacer: {
    width: 40,
    height: 40,
  },
  inlineTitle: {
    flex: 1,
    paddingHorizontal: 8,
  },
  right: {
    minWidth: 40,
    alignItems: 'flex-end',
  },
  largeTitle: {
    gap: 4,
  },
});
