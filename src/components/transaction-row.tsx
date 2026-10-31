import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/design';
import type { TransactionWithLines } from '@/domain';
import { type Lookup, presentTransaction } from '@/utils/transaction-presenter';

import { AppText } from './app-text';
import { IconBadge } from './icon-badge';
import { MoneyText } from './money-text';
import { PressableScale } from './pressable-scale';

type TransactionRowProps = {
  transaction: TransactionWithLines;
  lookup: Lookup;
  onPress?: () => void;
  last?: boolean;
  showReceiptMark?: boolean;
};

export function TransactionRow({
  transaction,
  lookup,
  onPress,
  last = false,
}: TransactionRowProps) {
  const theme = useTheme();
  const view = presentTransaction(transaction, lookup, theme.colors);
  const primaryAmount = view.amounts[view.amounts.length - 1];
  const secondaryAmount = view.amounts.length > 1 ? view.amounts[0] : undefined;
  const isNeutral = transaction.kind === 'transfer';

  return (
    <PressableScale
      onPress={onPress}
      disabled={!onPress}
      scaleTo={0.995}
      accessibilityRole="button"
      pressedStyle={{ backgroundColor: theme.colors.surfaceMuted }}
      style={[
        styles.row,
        {
          borderBottomColor: theme.colors.border,
          borderBottomWidth: last ? 0 : StyleSheet.hairlineWidth,
          paddingHorizontal: theme.spacing.lg,
        },
      ]}
    >
      <IconBadge icon={view.icon} color={view.color} size={42} outline />
      <View style={styles.text}>
        <AppText variant="bodyMedium" numberOfLines={1}>
          {view.title}
        </AppText>
        {view.subtitle ? (
          <AppText variant="caption" tone="muted" numberOfLines={1}>
            {view.subtitle}
          </AppText>
        ) : null}
      </View>
      <View style={styles.amounts}>
        {primaryAmount ? (
          <MoneyText
            amountMinor={primaryAmount.amountMinor}
            currency={primaryAmount.currency}
            signed={!isNeutral}
            tone={isNeutral ? 'text' : undefined}
            format={isNeutral ? { sign: 'never' } : undefined}
          />
        ) : null}
        {secondaryAmount ? (
          <MoneyText
            amountMinor={secondaryAmount.amountMinor}
            currency={secondaryAmount.currency}
            variant="amountSmall"
            tone="muted"
            format={{ sign: 'auto' }}
          />
        ) : null}
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  text: {
    flex: 1,
    gap: 2,
  },
  amounts: {
    alignItems: 'flex-end',
    gap: 2,
  },
});
