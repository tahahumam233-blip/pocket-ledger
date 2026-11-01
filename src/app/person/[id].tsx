import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Chip } from '@/components/chip';
import { CurrencyToggle } from '@/components/currency-toggle';
import { DebtBalanceText } from '@/components/debt-balance-text';
import { EmptyState } from '@/components/empty-state';
import { Icon } from '@/components/icon';
import { MoneyText } from '@/components/money-text';
import { PersonAvatar } from '@/components/person-avatar';
import { PressableScale } from '@/components/pressable-scale';
import { Screen } from '@/components/screen';
import { SectionHeader } from '@/components/section-header';
import brand from '@/config/brand.json';
import { useTheme } from '@/design';
import {
  currentYearMonth,
  debtStanding,
  describeDue,
  formatDateLabel,
  getCurrency,
  type IsoDate,
  minorToDecimalString,
  monthRange,
  shiftYearMonth,
  statementToCsv,
  statementToText,
  suggestDebtAction,
} from '@/domain';
import { haptics } from '@/platform/haptics';
import { shareText, shareTextFile } from '@/platform/share-file';
import { useLedgerStore } from '@/state/ledger-store';
import { showToast } from '@/state/toast-store';
import { useQuery } from '@/state/use-query';

type Period = 'all' | 'this_month' | 'last_month' | 'this_year';

const PERIODS: { value: Period; label: string }[] = [
  { value: 'all', label: 'All time' },
  { value: 'this_month', label: 'This month' },
  { value: 'last_month', label: 'Last month' },
  { value: 'this_year', label: 'This year' },
];

function rangeFor(period: Period): { from: IsoDate | null; to: IsoDate | null } {
  const now = currentYearMonth();
  switch (period) {
    case 'this_month':
      return { from: monthRange(now).start, to: monthRange(now).end };
    case 'last_month': {
      const last = monthRange(shiftYearMonth(now, -1));
      return { from: last.start, to: last.end };
    }
    case 'this_year':
      return { from: `${now.year}-01-01`, to: `${now.year}-12-31` };
    default:
      return { from: null, to: null };
  }
}

export default function PersonScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const snapshot = useLedgerStore((state) => state.snapshot);
  const currencies = snapshot?.settings.currencies ?? ['USD'];
  const [currencyChoice, setCurrency] = useState<string | null>(null);
  const [period, setPeriod] = useState<Period>('all');
  const range = rangeFor(period);

  const person = useQuery(
    async (s) =>
      (await s.queries.people({ includeArchived: true })).find(
        (entry) => entry.account.id === id,
      ) ?? null,
    [id],
  );
  const entry = person.data;
  const owing = currencies.filter((code) => (entry?.balances[code] ?? 0) !== 0);
  const currency = currencyChoice ?? owing[0] ?? currencies[0] ?? 'USD';
  const statement = useQuery(
    (s) => s.queries.personStatement(id, currency, range),
    [id, currency, range.from, range.to],
  );

  if (!entry) {
    return (
      <Screen header={{ title: 'Person', back: true }}>
        {person.loading ? null : (
          <EmptyState
            icon="person"
            title="Person not found"
            message="They may have been removed."
          />
        )}
      </Screen>
    );
  }

  const { account } = entry;
  const balance = entry.balances[currency] ?? 0;
  const due = describeDue(account.dueDate, snapshot?.today ?? '', owing.length > 0);
  const data = statement.data;

  const openDebt = (direction: 'gave' | 'got') =>
    router.push({
      pathname: '/transaction/new',
      params: { kind: 'debt', personId: account.id, action: suggestDebtAction(direction, balance) },
    });

  const settleUp = () => {
    if (balance === 0) return;
    router.push({
      pathname: '/transaction/new',
      params: {
        kind: 'debt',
        personId: account.id,
        action: balance > 0 ? 'collect' : 'repay',
        amount: minorToDecimalString(Math.abs(balance), getCurrency(currency).fractionDigits),
        currency,
      },
    });
  };

  const shareStatement = async () => {
    if (!data) return;
    try {
      const shared = await shareText(
        `Statement for ${account.name}`,
        statementToText(data, account.name, { appName: brand.name, today: snapshot?.today }),
      );
      if (shared) {
        haptics.success();
        showToast('Statement ready to send.', { tone: 'success' });
      }
    } catch (caught) {
      showToast(caught instanceof Error ? caught.message : 'Could not share.', { tone: 'danger' });
    }
  };

  const exportStatement = async () => {
    if (!data) return;
    const safeName = account.name.replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'person';
    try {
      await shareTextFile(
        `statement-${safeName}-${currency}.csv`,
        statementToCsv(data),
        'text/csv',
        'Statement',
      );
    } catch (caught) {
      showToast(caught instanceof Error ? caught.message : 'Could not export.', { tone: 'danger' });
    }
  };

  return (
    <Screen
      header={{
        title: account.name,
        back: true,
        right: (
          <PressableScale
            onPress={() =>
              router.push({ pathname: '/person/edit/[id]', params: { id: account.id } })
            }
            accessibilityRole="button"
            accessibilityLabel="Edit person"
            hitSlop={8}
          >
            <Icon name="create" size={22} color={theme.colors.primary} outline />
          </PressableScale>
        ),
      }}
    >
      <Card>
        <View style={styles.heroTop}>
          <PersonAvatar name={account.name} color={account.color} size={64} />
          <View style={styles.heroText}>
            <AppText variant="heading">{account.name}</AppText>
            {account.note ? (
              <AppText variant="caption" tone="muted">
                {account.note}
              </AppText>
            ) : null}
            {due ? (
              <View
                style={[
                  styles.dueChip,
                  {
                    backgroundColor: due.overdue
                      ? theme.colors.dangerSoft
                      : theme.colors.surfaceMuted,
                    borderRadius: theme.radii.pill,
                  },
                ]}
              >
                <Icon
                  name="time"
                  size={14}
                  color={due.overdue ? theme.colors.danger : theme.colors.textMuted}
                  outline
                />
                <AppText variant="captionStrong" tone={due.overdue ? 'danger' : 'muted'}>
                  {due.label}
                </AppText>
              </View>
            ) : null}
          </View>
        </View>
        <View style={[styles.balances, { borderTopColor: theme.colors.border }]}>
          {currencies.map((code) => {
            const value = entry.balances[code] ?? 0;
            const standing = debtStanding(value);
            return (
              <View key={code} style={styles.balance}>
                <AppText variant="micro" tone="muted">
                  {standing === 'owes_you'
                    ? 'Owes you'
                    : standing === 'you_owe'
                      ? 'You owe'
                      : 'Settled'}{' '}
                  · {code}
                </AppText>
                <MoneyText
                  amountMinor={Math.abs(value)}
                  currency={code}
                  variant="amountMedium"
                  tone={
                    standing === 'owes_you'
                      ? 'income'
                      : standing === 'you_owe'
                        ? 'expense'
                        : 'subtle'
                  }
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.6}
                />
              </View>
            );
          })}
        </View>
      </Card>

      <View style={styles.actions}>
        <Button
          label="I gave"
          icon="arrow-up-circle"
          variant="secondary"
          onPress={() => openDebt('gave')}
          style={styles.action}
          testID="person-gave"
        />
        <Button
          label="I got"
          icon="arrow-down-circle"
          variant="secondary"
          onPress={() => openDebt('got')}
          style={styles.action}
          testID="person-got"
        />
      </View>
      <View style={styles.secondaryActions}>
        <Chip
          label="They paid for me"
          icon="cart"
          size="sm"
          onPress={() =>
            router.push({
              pathname: '/transaction/new',
              params: { kind: 'expense', accountId: account.id },
            })
          }
        />
        {balance !== 0 ? (
          <Chip
            label={`Settle ${currency} in full`}
            icon="checkmark-done"
            size="sm"
            onPress={settleUp}
          />
        ) : null}
      </View>

      <View style={styles.section}>
        <SectionHeader title="Statement of account" />
        {currencies.length > 1 ? (
          <CurrencyToggle
            currencies={currencies}
            value={currency}
            onChange={setCurrency}
            size="md"
          />
        ) : null}
        <View style={styles.periods}>
          {PERIODS.map((option) => (
            <Chip
              key={option.value}
              label={option.label}
              size="sm"
              selected={period === option.value}
              onPress={() => setPeriod(option.value)}
            />
          ))}
        </View>

        {data ? (
          <Card padded={false}>
            <View style={[styles.statementRow, { borderBottomColor: theme.colors.border }]}>
              <View style={styles.statementText}>
                <AppText variant="bodyMedium">Opening balance</AppText>
                <AppText variant="caption" tone="muted">
                  {data.from
                    ? `Before ${formatDateLabel(data.from, snapshot?.today)}`
                    : 'Start of history'}
                </AppText>
              </View>
              <MoneyText
                amountMinor={data.openingMinor}
                currency={currency}
                variant="amount"
                signed
              />
            </View>
            {data.entries.length === 0 ? (
              <View style={styles.emptyPeriod}>
                <AppText variant="caption" tone="muted" align="center">
                  No entries in this period.
                </AppText>
              </View>
            ) : null}
            {data.entries.map((item) => (
              <PressableScale
                key={item.transactionId}
                onPress={() =>
                  router.push({ pathname: '/transaction/[id]', params: { id: item.transactionId } })
                }
                scaleTo={0.995}
                accessibilityRole="button"
                pressedStyle={{ backgroundColor: theme.colors.surfaceMuted }}
                style={[styles.statementRow, { borderBottomColor: theme.colors.border }]}
              >
                <View style={styles.statementText}>
                  <AppText variant="caption" tone="muted">
                    {formatDateLabel(item.postedDate, snapshot?.today)}
                  </AppText>
                  <AppText variant="bodyMedium">{item.description}</AppText>
                  {item.note ? (
                    <AppText variant="caption" tone="muted" numberOfLines={2}>
                      {item.note}
                    </AppText>
                  ) : null}
                </View>
                <View style={styles.statementAmounts}>
                  <AppText variant="micro" tone={item.gaveMinor ? 'expense' : 'income'}>
                    {item.gaveMinor ? 'You gave' : 'You got'}
                  </AppText>
                  <MoneyText
                    amountMinor={item.gaveMinor || item.gotMinor}
                    currency={currency}
                    variant="amount"
                  />
                  <AppText variant="caption" tone="muted">
                    Balance{' '}
                    <MoneyText
                      amountMinor={item.balanceMinor}
                      currency={currency}
                      variant="caption"
                      tone="muted"
                    />
                  </AppText>
                </View>
              </PressableScale>
            ))}
            <View style={[styles.totals, { backgroundColor: theme.colors.surfaceMuted }]}>
              <View style={styles.totalRow}>
                <AppText variant="label" tone="muted">
                  Total you gave
                </AppText>
                <MoneyText
                  amountMinor={data.totalGaveMinor}
                  currency={currency}
                  variant="amountSmall"
                />
              </View>
              <View style={styles.totalRow}>
                <AppText variant="label" tone="muted">
                  Total you got
                </AppText>
                <MoneyText
                  amountMinor={data.totalGotMinor}
                  currency={currency}
                  variant="amountSmall"
                />
              </View>
              <View style={styles.totalRow}>
                <AppText variant="labelStrong">Closing balance</AppText>
                <DebtBalanceText
                  balanceMinor={data.closingMinor}
                  currency={currency}
                  variant="amount"
                  testID="statement-closing"
                />
              </View>
            </View>
          </Card>
        ) : null}

        <View style={styles.actions}>
          <Button
            label="Share"
            icon="share"
            variant="soft"
            onPress={() => void shareStatement()}
            style={styles.action}
            testID="share-statement"
          />
          <Button
            label="Export CSV"
            icon="download"
            variant="soft"
            onPress={() => void exportStatement()}
            style={styles.action}
          />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  heroText: {
    flex: 1,
    gap: 4,
    alignItems: 'flex-start',
  },
  dueChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  balances: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  balance: {
    flex: 1,
    gap: 2,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  action: {
    flex: 1,
  },
  secondaryActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  section: {
    gap: 12,
  },
  periods: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  statementText: {
    flex: 1,
    gap: 2,
  },
  statementAmounts: {
    alignItems: 'flex-end',
    gap: 1,
  },
  emptyPeriod: {
    padding: 16,
  },
  totals: {
    padding: 16,
    gap: 8,
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
});
