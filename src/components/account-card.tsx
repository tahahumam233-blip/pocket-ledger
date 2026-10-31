import { StyleSheet, View } from 'react-native';

import { useTheme, withAlpha } from '@/design';
import type { Account } from '@/domain';

import { AppText } from './app-text';
import { IconBadge } from './icon-badge';
import { MoneyText } from './money-text';
import { PressableScale } from './pressable-scale';

type AccountCardProps = {
  account: Account;
  balances: Partial<Record<string, number>>;
  currencies: string[];
  onPress?: () => void;
  width?: number;
};

export function AccountCard({
  account,
  balances,
  currencies,
  onPress,
  width = 168,
}: AccountCardProps) {
  const theme = useTheme();
  return (
    <PressableScale
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole="button"
      accessibilityLabel={`${account.name} account`}
      style={[
        styles.card,
        {
          width,
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
          borderRadius: theme.radii.xl,
          shadowColor: theme.colors.shadow,
        },
        theme.isDark ? null : styles.shadow,
      ]}
    >
      <View
        style={[
          styles.accent,
          { backgroundColor: withAlpha(account.color, theme.isDark ? 0.35 : 0.18) },
        ]}
      />
      <View style={styles.header}>
        <IconBadge icon={account.icon} color={account.color} size={36} solid />
        <AppText variant="bodyStrong" numberOfLines={1} style={styles.name}>
          {account.name}
        </AppText>
      </View>
      <View style={styles.balances}>
        {currencies.map((currency) => (
          <MoneyText
            key={currency}
            amountMinor={balances[currency] ?? 0}
            currency={currency}
            variant={currency === currencies[0] ? 'amount' : 'amountSmall'}
            tone={currency === currencies[0] ? 'text' : 'muted'}
          />
        ))}
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 14,
    gap: 14,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  shadow: {
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  accent: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 110,
    height: 110,
    borderRadius: 55,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  name: {
    flex: 1,
  },
  balances: {
    gap: 2,
  },
});
