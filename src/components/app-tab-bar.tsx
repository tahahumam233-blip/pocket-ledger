import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/design';
import { useQuickCapture } from '@/features/receipts/use-quick-capture';
import { haptics } from '@/platform/haptics';
import { useLedgerStore } from '@/state/ledger-store';

import { AppText } from './app-text';
import { Icon } from './icon';
import { PressableScale } from './pressable-scale';

const TAB_ICONS: Record<string, string> = {
  index: 'home',
  activity: 'list',
  receipts: 'receipt',
  reports: 'pie-chart',
};

/** Four tabs with a raised center button for adding a transaction. */
export function AppTabBar({ state, descriptors, navigateToTab, insets }: BottomTabBarProps) {
  const theme = useTheme();
  const router = useRouter();
  const pending = useLedgerStore((store) => store.snapshot?.pendingReceipts ?? 0);
  const capture = useQuickCapture();
  const bottom = Math.max(insets.bottom, 8);

  const tabs = state.routes.map((route, index) => {
    const focused = state.index === index;
    const options = descriptors[route.key]?.options;
    const label = typeof options?.title === 'string' ? options.title : route.name;
    const color = focused ? theme.colors.primary : theme.colors.textSubtle;
    const badge = route.name === 'receipts' && pending > 0 ? pending : null;
    return (
      <PressableScale
        key={route.key}
        onPress={() => {
          haptics.tap();
          navigateToTab(route.key);
        }}
        accessibilityRole="tab"
        accessibilityState={{ selected: focused }}
        accessibilityLabel={label}
        style={styles.tab}
        scaleTo={0.94}
      >
        <View>
          <Icon
            name={TAB_ICONS[route.name] ?? 'ellipse'}
            size={24}
            color={color}
            outline={!focused}
          />
          {badge ? (
            <View
              style={[
                styles.badge,
                { backgroundColor: theme.colors.warning, borderColor: theme.colors.tabBar },
              ]}
            >
              <AppText variant="micro" color="#FFFFFF">
                {badge > 9 ? '9+' : String(badge)}
              </AppText>
            </View>
          ) : null}
        </View>
        <AppText variant="micro" color={color}>
          {label}
        </AppText>
      </PressableScale>
    );
  });

  return (
    <View
      style={[
        styles.bar,
        {
          backgroundColor: theme.colors.tabBar,
          borderTopColor: theme.colors.border,
          paddingBottom: bottom,
          height: theme.layout.tabBarHeight + bottom,
        },
      ]}
    >
      {tabs.slice(0, 2)}
      <View style={styles.centerSlot}>
        <PressableScale
          onPress={() => {
            haptics.light();
            router.push({ pathname: '/transaction/new', params: { kind: 'expense' } });
          }}
          onLongPress={() => {
            haptics.light();
            void capture.snap();
          }}
          accessibilityRole="button"
          accessibilityLabel="Add transaction"
          accessibilityHint="Long press to snap a receipt"
          style={[
            styles.centerButton,
            { backgroundColor: theme.colors.primary, shadowColor: theme.colors.primary },
          ]}
          scaleTo={0.92}
        >
          <Icon name="add" size={30} color={theme.colors.onPrimary} />
        </PressableScale>
      </View>
      {tabs.slice(2)}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 8,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  centerSlot: {
    width: 76,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -22,
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -10,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
});
