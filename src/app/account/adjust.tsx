import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AmountKeypad } from '@/components/amount-keypad';
import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Chip } from '@/components/chip';
import { TextField } from '@/components/form-row';
import { MoneyText } from '@/components/money-text';
import { Screen } from '@/components/screen';
import { useTheme } from '@/design';
import { formatAmountDraft, getCurrency, parseAmount, todayIsoDate } from '@/domain';
import { haptics } from '@/platform/haptics';
import { useLedgerStore } from '@/state/ledger-store';
import { showToast } from '@/state/toast-store';

export default function AdjustBalanceScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { accountId, currency } = useLocalSearchParams<{ accountId: string; currency: string }>();
  const snapshot = useLedgerStore((state) => state.snapshot);
  const mutate = useLedgerStore((state) => state.mutate);
  const entry = snapshot?.accountBalances.find((item) => item.account.id === accountId);
  const code = currency || snapshot?.settings.currencies[0] || 'USD';
  const info = getCurrency(code);
  const ledger = entry?.balances[code] ?? 0;
  const [draft, setDraft] = useState('');
  const [negative, setNegative] = useState(false);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const parsed = parseAmount(draft, info.fractionDigits);
  const actual = parsed.ok ? (negative ? -parsed.minor : parsed.minor) : null;
  const difference = actual === null ? null : actual - ledger;

  const save = async () => {
    if (actual === null || !entry) return;
    setSaving(true);
    try {
      const result = await mutate((s) =>
        s.ledger.adjustBalance({
          accountId: entry.account.id,
          currency: code,
          actualMinor: actual,
          postedDate: todayIsoDate(),
          note,
        }),
      );
      haptics.success();
      showToast(result.transaction ? 'Balance adjusted.' : 'Already matches. Nothing to change.', {
        tone: 'success',
      });
      if (router.canGoBack()) router.back();
    } catch (caught) {
      haptics.error();
      showToast(caught instanceof Error ? caught.message : 'Could not adjust.', { tone: 'danger' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen
      scroll={false}
      edges={['top', 'bottom']}
      header={{ title: `Adjust ${entry?.account.name ?? 'balance'}`, close: true }}
      contentStyle={styles.content}
    >
      <View style={styles.body}>
        <Card muted>
          <AppText variant="caption" tone="muted">
            The ledger says this account holds
          </AppText>
          <MoneyText amountMinor={ledger} currency={code} variant="amountLarge" />
          <AppText variant="caption" tone="muted">
            Enter what you actually counted. The difference is recorded as an adjustment; nothing in
            your history is changed.
          </AppText>
        </Card>

        <View style={styles.amountBlock}>
          <AppText variant="micro" tone="muted">
            Actual {code} balance
          </AppText>
          <View style={styles.amountRow}>
            {negative ? <AppText variant="heading">−</AppText> : null}
            {info.symbolPosition === 'before' ? (
              <AppText variant="heading">{info.symbol}</AppText>
            ) : null}
            <AppText variant="amountHero" numberOfLines={1} adjustsFontSizeToFit>
              {formatAmountDraft(draft)}
            </AppText>
            {info.symbolPosition === 'after' ? (
              <AppText variant="heading">{info.code}</AppText>
            ) : null}
          </View>
          <View style={styles.chips}>
            <Chip
              label="Negative balance"
              size="sm"
              selected={negative}
              onPress={() => setNegative((value) => !value)}
            />
            <Chip
              label="Use ledger value"
              size="sm"
              onPress={() => {
                setNegative(ledger < 0);
                setDraft(
                  formatAmountDraft(String(Math.abs(ledger) / 10 ** info.fractionDigits)).replace(
                    /,/g,
                    '',
                  ),
                );
              }}
            />
          </View>
        </View>

        {difference !== null ? (
          <Card>
            <View style={styles.diffRow}>
              <AppText variant="bodyMedium">Adjustment to record</AppText>
              <MoneyText amountMinor={difference} currency={code} variant="amount" signed />
            </View>
          </Card>
        ) : null}

        <TextField
          value={note}
          onChangeText={setNote}
          placeholder="Note (optional), e.g. counted the safe"
          returnKeyType="done"
        />
        <Button
          label={difference === 0 ? 'Nothing to adjust' : 'Record adjustment'}
          onPress={() => void save()}
          disabled={actual === null || difference === 0}
          loading={saving}
          size="lg"
          fullWidth
        />
      </View>
      <View style={[styles.keypad, { borderTopColor: theme.colors.border }]}>
        <AmountKeypad value={draft} onChange={setDraft} fractionDigits={info.fractionDigits} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 0,
    gap: 0,
    paddingBottom: 0,
  },
  body: {
    flex: 1,
    paddingHorizontal: 20,
    gap: 14,
  },
  amountBlock: {
    alignItems: 'center',
    gap: 6,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  chips: {
    flexDirection: 'row',
    gap: 8,
  },
  diffRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  keypad: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
