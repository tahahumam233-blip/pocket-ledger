import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Card } from '@/components/card';
import { MoneyText } from '@/components/money-text';
import type { DebtTotals } from '@/domain';

type DebtSummaryProps = {
  totals: DebtTotals;
  currencies: string[];
  onPress?: () => void;
};

/** Two tiles: total receivables and total payables, each per currency. */
export function DebtSummary({ totals, currencies, onPress }: DebtSummaryProps) {
  const column = (
    title: string,
    values: Partial<Record<string, number>>,
    tone: 'income' | 'expense',
  ) => (
    <View style={styles.column}>
      <AppText variant="micro" tone="muted">
        {title}
      </AppText>
      {currencies.map((currency, index) => (
        <MoneyText
          key={currency}
          amountMinor={values[currency] ?? 0}
          currency={currency}
          variant={index === 0 ? 'amountMedium' : 'amount'}
          tone={values[currency] ? tone : 'subtle'}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.6}
        />
      ))}
    </View>
  );
  return (
    <Card onPress={onPress} accessibilityLabel="Receivables and payables summary">
      <View style={styles.row}>
        {column('Receivables', totals.owedToYou, 'income')}
        {column('Payables', totals.youOwe, 'expense')}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 16,
  },
  column: {
    flex: 1,
    gap: 2,
  },
});
