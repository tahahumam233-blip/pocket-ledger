import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AmountKeypad } from '@/components/amount-keypad';
import { AppText } from '@/components/app-text';
import { BottomSheet } from '@/components/bottom-sheet';
import { Button } from '@/components/button';
import { Chip } from '@/components/chip';
import { MoneyText } from '@/components/money-text';
import { useTheme } from '@/design';
import {
  formatAmountDraft,
  formatMoney,
  getCurrency,
  minorToDecimalString,
  parseAmount,
} from '@/domain';

export type BudgetSheetTarget = {
  /** "All expenses" or the category's name. */
  title: string;
  currency: string;
  /** The current budget, if there is one. */
  amountMinor: number | null;
  spentMinor: number;
  suggestionMinor: number | null;
  suggestionDays: number;
};

type BudgetSheetProps = {
  target: BudgetSheetTarget | null;
  onClose: () => void;
  onSave: (amountMinor: number) => Promise<void>;
  onRemove: () => Promise<void>;
};

function draftOf(minor: number, currency: string): string {
  const text = minorToDecimalString(minor, getCurrency(currency).fractionDigits);
  return text.includes('.') ? text.replace(/0+$/, '').replace(/\.$/, '') : text;
}

/** Sets or changes one monthly budget with the keypad, or removes it. */
export function BudgetSheet({ target, onClose, onSave, onRemove }: BudgetSheetProps) {
  return (
    <BottomSheet
      visible={target !== null}
      onClose={onClose}
      title={target ? `${target.title} budget` : 'Budget'}
      scroll={false}
    >
      {target ? (
        <BudgetEditor
          key={`${target.title}-${target.currency}`}
          target={target}
          onSave={onSave}
          onRemove={onRemove}
        />
      ) : null}
    </BottomSheet>
  );
}

function BudgetEditor({
  target,
  onSave,
  onRemove,
}: {
  target: BudgetSheetTarget;
  onSave: (amountMinor: number) => Promise<void>;
  onRemove: () => Promise<void>;
}) {
  const theme = useTheme();
  const currency = getCurrency(target.currency);
  const [draft, setDraft] = useState(() =>
    target.amountMinor ? draftOf(target.amountMinor, target.currency) : '',
  );
  const [busy, setBusy] = useState(false);
  const parsed = parseAmount(draft, currency.fractionDigits);
  const amountMinor = parsed.ok ? parsed.minor : 0;
  const text = formatAmountDraft(draft);

  const run = async (work: () => Promise<void>) => {
    setBusy(true);
    try {
      await work();
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.body}>
      <View style={styles.amount}>
        <AppText variant="micro" tone="muted">
          Each month · {target.currency}
        </AppText>
        <AppText
          variant="amountHero"
          color={draft ? theme.colors.text : theme.colors.textSubtle}
          numberOfLines={1}
          adjustsFontSizeToFit
          testID="budget-amount"
        >
          {currency.symbolPosition === 'before'
            ? `${currency.symbol}${text}`
            : `${text} ${currency.code}`}
        </AppText>
        <AppText variant="caption" tone="muted">
          Spent this month{' '}
          <MoneyText amountMinor={target.spentMinor} currency={target.currency} variant="caption" />
        </AppText>
      </View>
      {target.suggestionMinor ? (
        <View style={styles.suggestion}>
          <Chip
            label={`Use ${formatMoney(target.suggestionMinor, target.currency)} (your average)`}
            icon="sparkles"
            size="sm"
            onPress={() => setDraft(draftOf(target.suggestionMinor ?? 0, target.currency))}
          />
          <AppText variant="caption" tone="subtle" align="center">
            Based on your spending over the last {target.suggestionDays} days.
          </AppText>
        </View>
      ) : null}
      <AmountKeypad value={draft} onChange={setDraft} fractionDigits={currency.fractionDigits} />
      <Button
        label={target.amountMinor ? 'Save budget' : 'Set budget'}
        onPress={() => void run(() => onSave(amountMinor))}
        disabled={amountMinor <= 0 || amountMinor === target.amountMinor}
        loading={busy}
        size="lg"
        fullWidth
        testID="budget-save"
      />
      {target.amountMinor ? (
        <Button
          label="Remove budget"
          icon="trash"
          variant="ghost"
          onPress={() => void run(onRemove)}
          disabled={busy}
          fullWidth
          testID="budget-remove"
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  body: {
    gap: 12,
  },
  amount: {
    alignItems: 'center',
    gap: 2,
  },
  suggestion: {
    alignItems: 'center',
    gap: 4,
  },
});
