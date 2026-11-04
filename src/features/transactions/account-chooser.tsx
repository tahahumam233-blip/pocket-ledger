import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Icon } from '@/components/icon';
import { IconBadge } from '@/components/icon-badge';
import { MoneyText } from '@/components/money-text';
import { PressableScale } from '@/components/pressable-scale';
import { useTheme, withAlpha } from '@/design';
import { type Account, formatMoney } from '@/domain';
import { useAmountsHidden } from '@/state/ledger-store';

const PER_ROW = 3;

type AccountChooserProps = {
  /** What the choice means for this entry, such as "Paid from" or "Received into". */
  label: string;
  accounts: Account[];
  value: string;
  currency: string;
  balances: ReadonlyMap<string, Partial<Record<string, number>>>;
  /** Signed change the entry makes to the chosen account, for the before and after line. */
  changeMinor: number;
  onChange: (account: Account) => void;
  /** An account that cannot be chosen here, such as the other side of a transfer. */
  disabledId?: string;
  footer?: ReactNode;
  testID?: string;
};

/**
 * Every cash and bank account as a tile in its own colour, always on screen, so the
 * account an entry posts to is seen and changed with one tap instead of hidden in a row.
 */
export function AccountChooser({
  label,
  accounts,
  value,
  currency,
  balances,
  changeMinor,
  onChange,
  disabledId,
  footer,
  testID,
}: AccountChooserProps) {
  const theme = useTheme();
  const masked = useAmountsHidden();
  const selected = accounts.find((account) => account.id === value);
  const rows: Account[][] = [];
  for (let index = 0; index < accounts.length; index += PER_ROW) {
    rows.push(accounts.slice(index, index + PER_ROW));
  }
  const before = selected ? (balances.get(selected.id)?.[currency] ?? 0) : 0;
  const after = before + changeMinor;
  // While amounts are hidden the warning would hint at the balance, so it stays quiet.
  const overdrawn = !masked && Boolean(selected) && changeMinor < 0 && after < 0;

  return (
    <View style={styles.wrap} testID={testID}>
      <AppText variant="labelStrong">{label}</AppText>
      <View accessibilityRole="radiogroup" accessibilityLabel={label} style={styles.grid}>
        {rows.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.row}>
            {row.map((account) => {
              const isSelected = account.id === value;
              const disabled = account.id === disabledId;
              const balance = balances.get(account.id)?.[currency] ?? 0;
              return (
                <PressableScale
                  key={account.id}
                  onPress={() => onChange(account)}
                  disabled={disabled}
                  haptic
                  accessibilityRole="radio"
                  aria-checked={isSelected}
                  aria-disabled={disabled}
                  accessibilityLabel={`${label} ${account.name}, ${formatMoney(balance, currency, { masked })}`}
                  testID={`${testID ?? 'account'}-${account.name}`}
                  style={[
                    styles.tile,
                    {
                      borderRadius: theme.radii.lg,
                      borderWidth: isSelected ? 2 : StyleSheet.hairlineWidth,
                      borderColor: isSelected ? account.color : theme.colors.border,
                      backgroundColor: isSelected
                        ? withAlpha(account.color, theme.isDark ? 0.26 : 0.12)
                        : theme.colors.surface,
                      opacity: disabled ? 0.4 : 1,
                    },
                  ]}
                >
                  <View style={styles.tileTop}>
                    <IconBadge
                      icon={account.icon}
                      color={account.color}
                      size={30}
                      solid={isSelected}
                    />
                    {isSelected ? (
                      <Icon name="checkmark-circle" size={20} color={account.color} />
                    ) : null}
                  </View>
                  <AppText variant="bodyStrong" numberOfLines={1}>
                    {account.name}
                  </AppText>
                  <MoneyText
                    amountMinor={balance}
                    currency={currency}
                    variant="caption"
                    tone={balance < 0 && !masked ? 'danger' : 'muted'}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.7}
                  />
                </PressableScale>
              );
            })}
            {row.length < PER_ROW && rows.length > 1
              ? Array.from({ length: PER_ROW - row.length }, (_, index) => (
                  <View key={`pad-${index}`} style={styles.pad} />
                ))
              : null}
          </View>
        ))}
      </View>

      {selected && changeMinor !== 0 ? (
        <View
          style={[
            styles.effect,
            {
              borderRadius: theme.radii.md,
              backgroundColor: overdrawn ? theme.colors.warningSoft : theme.colors.surfaceMuted,
            },
          ]}
          testID={testID ? `${testID}-effect` : undefined}
        >
          <AppText variant="label" tone={overdrawn ? 'warning' : 'muted'} style={styles.effectText}>
            {selected.name}{' '}
            <MoneyText
              amountMinor={before}
              currency={currency}
              variant="label"
              tone={overdrawn ? 'warning' : 'muted'}
            />
            {'  →  '}
            <MoneyText
              amountMinor={after}
              currency={currency}
              variant="labelStrong"
              tone={overdrawn ? 'warning' : 'text'}
            />
          </AppText>
          {overdrawn ? (
            <View style={styles.warningRow}>
              <Icon name="alert-circle" size={16} color={theme.colors.warning} />
              <AppText variant="caption" tone="warning" style={styles.effectText}>
                This takes {selected.name} below zero. Check the account before saving.
              </AppText>
            </View>
          ) : null}
        </View>
      ) : null}

      {footer}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 8,
  },
  grid: {
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  tile: {
    flex: 1,
    minHeight: 92,
    paddingHorizontal: 10,
    paddingVertical: 10,
    gap: 4,
  },
  tileTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  pad: {
    flex: 1,
  },
  effect: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 4,
  },
  effectText: {
    flex: 1,
  },
  warningRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
});
