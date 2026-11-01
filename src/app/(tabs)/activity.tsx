import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, SectionList, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Card } from '@/components/card';
import { Chip } from '@/components/chip';
import { EmptyState } from '@/components/empty-state';
import { TextField } from '@/components/form-row';
import { MoneyText } from '@/components/money-text';
import { MonthSwitcher } from '@/components/month-switcher';
import { Screen, ScreenHeader } from '@/components/screen';
import { TransactionRow } from '@/components/transaction-row';
import { useTheme } from '@/design';
import {
  currentYearMonth,
  expenseTotalsByCurrency,
  formatDateLabel,
  formatMoney,
  monthRange,
  type ReportLine,
  type TransactionKind,
  type TransactionWithLines,
  type YearMonth,
} from '@/domain';
import { useLedgerStore } from '@/state/ledger-store';
import { useQuery } from '@/state/use-query';
import { buildLookup, groupByDay } from '@/utils/transaction-presenter';

type KindFilter = 'all' | 'expense' | 'income' | 'transfer' | 'debt';

const KIND_OPTIONS: {
  value: KindFilter;
  label: string;
  kinds?: TransactionKind[];
  debts?: 'only' | 'exclude';
}[] = [
  { value: 'all', label: 'All' },
  { value: 'expense', label: 'Expenses', kinds: ['expense'] },
  { value: 'income', label: 'Income', kinds: ['income'] },
  { value: 'transfer', label: 'Transfers', kinds: ['transfer'], debts: 'exclude' },
  { value: 'debt', label: 'Debts', kinds: ['transfer'], debts: 'only' },
];

function parseMonthParam(value: string | undefined): YearMonth {
  const match = value ? /^(\d{4})-(\d{2})$/.exec(value) : null;
  if (!match) return currentYearMonth();
  return { year: Number(match[1]), month: Number(match[2]) };
}

function toReportLines(transactions: TransactionWithLines[]): ReportLine[] {
  return transactions.flatMap((transaction) =>
    transaction.lines.map((line) => ({
      transactionId: transaction.id,
      kind: transaction.kind,
      categoryId: transaction.categoryId,
      accountId: line.accountId,
      currency: line.currency,
      amountMinor: line.amountMinor,
      postedDate: transaction.postedDate,
    })),
  );
}

export default function ActivityScreen() {
  const theme = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{
    categoryId?: string;
    accountId?: string;
    month?: string;
  }>();
  const snapshot = useLedgerStore((state) => state.snapshot);
  const [month, setMonth] = useState<YearMonth>(() => parseMonthParam(params.month));
  const [kind, setKind] = useState<KindFilter>('all');
  const [currency, setCurrency] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(params.categoryId ?? null);
  const [accountId, setAccountId] = useState<string | null>(params.accountId ?? null);

  const range = monthRange(month);
  const kindOption = KIND_OPTIONS.find((option) => option.value === kind);
  const kinds = kindOption?.kinds;
  const query = useQuery(
    (services) =>
      services.queries.transactions({
        dateFrom: range.start,
        dateTo: range.end,
        kinds,
        debts: kindOption?.debts,
        currency: currency ?? undefined,
        categoryId: categoryId ?? undefined,
        accountId: accountId ?? undefined,
        search: search.trim() || undefined,
        limit: 1000,
      }),
    [range.start, range.end, kind, currency, categoryId, accountId, search],
  );

  const lookup = useMemo(
    () => buildLookup(snapshot?.allAccounts ?? [], snapshot?.categories ?? []),
    [snapshot?.allAccounts, snapshot?.categories],
  );
  const transactions = useMemo(() => query.data ?? [], [query.data]);
  const sections = useMemo(
    () => groupByDay(transactions).map((section) => ({ title: section.date, data: section.items })),
    [transactions],
  );
  const monthLines = useMemo(() => toReportLines(transactions), [transactions]);
  const spent = expenseTotalsByCurrency(monthLines);
  const received = new Map<string, number>();
  for (const line of monthLines) {
    if (line.kind === 'income')
      received.set(line.currency, (received.get(line.currency) ?? 0) + line.amountMinor);
  }
  const currencies = snapshot?.settings.currencies ?? [];
  const activeCategory = categoryId ? lookup.categories.get(categoryId) : null;
  const activeAccount = accountId ? lookup.accounts.get(accountId) : null;

  const dayTotals = (items: TransactionWithLines[]) => {
    const totals = expenseTotalsByCurrency(toReportLines(items));
    return [...totals.entries()]
      .map(([code, amount]) => `-${formatMoney(amount, code)}`)
      .join('  ·  ');
  };

  const header = (
    <View style={styles.header}>
      <ScreenHeader title="Activity" large subtitle="Every entry, grouped by day." />
      <View style={styles.filters}>
        <TextField
          value={search}
          onChangeText={setSearch}
          placeholder="Search notes, categories and people"
          autoCorrect={false}
          clearButtonMode="while-editing"
          returnKeyType="search"
        />
        <MonthSwitcher value={month} onChange={setMonth} />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
          style={styles.chipScroll}
        >
          {KIND_OPTIONS.map((option) => (
            <Chip
              key={option.value}
              label={option.label}
              selected={kind === option.value}
              onPress={() => setKind(option.value)}
            />
          ))}
          {currencies.map((code) => (
            <Chip
              key={code}
              label={code}
              selected={currency === code}
              onPress={() => setCurrency(currency === code ? null : code)}
            />
          ))}
          {activeCategory ? (
            <Chip
              label={`${activeCategory.name} ✕`}
              selected
              color={activeCategory.color}
              onPress={() => setCategoryId(null)}
            />
          ) : null}
          {activeAccount ? (
            <Chip
              label={`${activeAccount.name} ✕`}
              selected
              color={activeAccount.color}
              onPress={() => setAccountId(null)}
            />
          ) : null}
        </ScrollView>
        <Card muted>
          <View style={styles.summaryRow}>
            <View style={styles.summaryCol}>
              <AppText variant="micro" tone="muted">
                Spent
              </AppText>
              {currencies.map((code) => (
                <MoneyText
                  key={code}
                  amountMinor={spent.get(code) ?? 0}
                  currency={code}
                  variant="amount"
                  tone={spent.get(code) ? 'expense' : 'subtle'}
                />
              ))}
            </View>
            <View style={styles.summaryCol}>
              <AppText variant="micro" tone="muted">
                Received
              </AppText>
              {currencies.map((code) => (
                <MoneyText
                  key={code}
                  amountMinor={received.get(code) ?? 0}
                  currency={code}
                  variant="amount"
                  tone={received.get(code) ? 'income' : 'subtle'}
                />
              ))}
            </View>
          </View>
        </Card>
      </View>
    </View>
  );

  return (
    <Screen scroll={false} contentStyle={styles.content} bottomInset={0}>
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={header}
        stickySectionHeadersEnabled={false}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: theme.layout.tabBarHeight + 40 }}
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader}>
            <AppText variant="labelStrong" tone="muted">
              {formatDateLabel(section.title, snapshot?.today)}
            </AppText>
            <AppText variant="captionStrong" tone="muted">
              {dayTotals(section.data)}
            </AppText>
          </View>
        )}
        renderItem={({ item, index, section }) => (
          <View
            style={[
              styles.rowWrap,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
                borderTopLeftRadius: index === 0 ? theme.radii.xl : 0,
                borderTopRightRadius: index === 0 ? theme.radii.xl : 0,
                borderBottomLeftRadius: index === section.data.length - 1 ? theme.radii.xl : 0,
                borderBottomRightRadius: index === section.data.length - 1 ? theme.radii.xl : 0,
                borderTopWidth: index === 0 ? StyleSheet.hairlineWidth : 0,
                borderBottomWidth: index === section.data.length - 1 ? StyleSheet.hairlineWidth : 0,
              },
            ]}
          >
            <TransactionRow
              transaction={item}
              lookup={lookup}
              last={index === section.data.length - 1}
              onPress={() =>
                router.push({ pathname: '/transaction/[id]', params: { id: item.id } })
              }
            />
          </View>
        )}
        ListEmptyComponent={
          query.loading && !query.data ? undefined : (
            <EmptyState
              icon="calendar"
              title="Nothing here yet"
              message={
                search || categoryId || accountId || kind !== 'all' || currency
                  ? 'No entries match these filters for this month.'
                  : 'Entries you record this month will show up here, grouped by day.'
              }
              actionLabel="Add an expense"
              onAction={() =>
                router.push({ pathname: '/transaction/new', params: { kind: 'expense' } })
              }
            />
          )
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 0,
    gap: 0,
  },
  header: {
    gap: 4,
  },
  filters: {
    paddingHorizontal: 20,
    gap: 12,
    paddingBottom: 8,
  },
  chipScroll: {
    marginHorizontal: -20,
  },
  chips: {
    paddingHorizontal: 20,
    gap: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 16,
  },
  summaryCol: {
    flex: 1,
    gap: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 8,
  },
  rowWrap: {
    marginHorizontal: 20,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderRightWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
});
