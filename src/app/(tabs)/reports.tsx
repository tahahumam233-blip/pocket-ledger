import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Card } from '@/components/card';
import { BarChart } from '@/components/charts/bar-chart';
import { DonutChart } from '@/components/charts/donut-chart';
import { CurrencyToggle } from '@/components/currency-toggle';
import { EmptyState } from '@/components/empty-state';
import { IconBadge } from '@/components/icon-badge';
import { MoneyText } from '@/components/money-text';
import { MonthSwitcher } from '@/components/month-switcher';
import { PressableScale } from '@/components/pressable-scale';
import { Screen } from '@/components/screen';
import { SectionHeader } from '@/components/section-header';
import { useTheme } from '@/design';
import {
  currentYearMonth,
  formatMoney,
  getCurrency,
  monthKey,
  SHORT_MONTH_NAMES,
  type YearMonth,
} from '@/domain';
import { useLedgerStore } from '@/state/ledger-store';
import { useQuery } from '@/state/use-query';

function changeLabel(
  current: number,
  previous: number,
): { text: string; tone: 'income' | 'expense' | 'muted' } {
  if (previous === 0)
    return { text: current === 0 ? 'Same as last month' : 'No expenses last month', tone: 'muted' };
  const delta = Math.round(((current - previous) / previous) * 100);
  if (delta === 0) return { text: 'Same as last month', tone: 'muted' };
  return delta > 0
    ? { text: `${delta}% more than last month`, tone: 'expense' }
    : { text: `${Math.abs(delta)}% less than last month`, tone: 'income' };
}

export default function ReportsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const snapshot = useLedgerStore((state) => state.snapshot);
  const currencies = snapshot?.settings.currencies ?? ['USD'];
  const [month, setMonth] = useState<YearMonth>(currentYearMonth);
  const [currency, setCurrency] = useState<string>(currencies[0] ?? 'USD');
  const activeCurrency = currencies.includes(currency) ? currency : (currencies[0] ?? 'USD');
  const report = useQuery(
    (s) => s.queries.monthReport(month, activeCurrency),
    [monthKey(month), activeCurrency],
  );
  const categories = new Map(
    (snapshot?.categories ?? []).map((category) => [category.id, category]),
  );

  const summary = report.data?.summary;
  const previous = report.data?.previous;
  const topCategories = summary?.expenseByCategory.slice(0, 6) ?? [];
  const rest = summary?.expenseByCategory.slice(6) ?? [];
  const restTotal = rest.reduce((sum, item) => sum + item.total, 0);
  const slices = topCategories.map((item) => ({
    key: item.categoryId ?? 'none',
    value: item.total,
    color: (item.categoryId && categories.get(item.categoryId)?.color) || theme.colors.textSubtle,
  }));
  if (restTotal > 0)
    slices.push({ key: 'other', value: restTotal, color: theme.colors.textSubtle });
  const change = summary && previous ? changeLabel(summary.expense, previous.expense) : null;
  const fractionDigits = getCurrency(activeCurrency).fractionDigits;
  const compact = (minor: number) => {
    const units = minor / 10 ** fractionDigits;
    if (units >= 1_000_000) return `${(units / 1_000_000).toFixed(1)}M`;
    if (units >= 10_000) return `${Math.round(units / 1000)}k`;
    if (units >= 1000) return `${(units / 1000).toFixed(1)}k`;
    return formatMoney(minor, activeCurrency, { bare: true });
  };

  return (
    <Screen
      header={{ title: 'Reports', large: true, subtitle: 'Where the money went.' }}
      bottomInset={theme.layout.tabBarHeight}
    >
      <MonthSwitcher value={month} onChange={setMonth} />
      {currencies.length > 1 ? (
        <CurrencyToggle
          currencies={currencies}
          value={activeCurrency}
          onChange={setCurrency}
          size="md"
        />
      ) : null}

      <View style={styles.tiles}>
        <Card style={styles.tile}>
          <AppText variant="micro" tone="muted">
            Expenses
          </AppText>
          <MoneyText
            amountMinor={summary?.expense ?? 0}
            currency={activeCurrency}
            variant="amountMedium"
            tone="expense"
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.6}
          />
          {change ? (
            <AppText variant="caption" tone={change.tone}>
              {change.text}
            </AppText>
          ) : null}
        </Card>
        <Card style={styles.tile}>
          <AppText variant="micro" tone="muted">
            Income
          </AppText>
          <MoneyText
            amountMinor={summary?.income ?? 0}
            currency={activeCurrency}
            variant="amountMedium"
            tone="income"
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.6}
          />
          <AppText variant="caption" tone="muted">
            {summary
              ? `${summary.incomeCount} ${summary.incomeCount === 1 ? 'entry' : 'entries'}`
              : ' '}
          </AppText>
        </Card>
      </View>

      <Card muted>
        <View style={styles.netRow}>
          <View style={styles.netText}>
            <AppText variant="labelStrong">Net income</AppText>
            <AppText variant="caption" tone="muted">
              Income less expenses. Excludes transfers, exchanges, loans, opening balances and
              adjustments.
            </AppText>
          </View>
          <MoneyText
            amountMinor={summary?.net ?? 0}
            currency={activeCurrency}
            variant="amountMedium"
            signed
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.6}
          />
        </View>
      </Card>

      <View style={styles.section}>
        <SectionHeader title="Expenses by category" />
        <Card>
          {summary && summary.expense > 0 ? (
            <View style={styles.donutLayout}>
              <View style={styles.donutWrap}>
                <DonutChart slices={slices} size={190} thickness={24}>
                  <AppText variant="micro" tone="muted">
                    Total
                  </AppText>
                  <MoneyText
                    amountMinor={summary.expense}
                    currency={activeCurrency}
                    variant="subheading"
                  />
                  <AppText variant="caption" tone="muted">
                    {summary.expenseCount} {summary.expenseCount === 1 ? 'expense' : 'expenses'}
                  </AppText>
                </DonutChart>
              </View>
              <View style={styles.legend}>
                {topCategories.map((item) => {
                  const category = item.categoryId ? categories.get(item.categoryId) : undefined;
                  const color = category?.color ?? theme.colors.textSubtle;
                  return (
                    <PressableScale
                      key={item.categoryId ?? 'none'}
                      onPress={() =>
                        router.push({
                          pathname: '/activity',
                          params: { categoryId: item.categoryId ?? '', month: monthKey(month) },
                        })
                      }
                      accessibilityRole="button"
                      style={styles.legendRow}
                      scaleTo={0.99}
                    >
                      <IconBadge
                        icon={category?.icon ?? 'ellipse'}
                        color={color}
                        size={36}
                        outline
                      />
                      <View style={styles.legendText}>
                        <AppText variant="bodyMedium" numberOfLines={1}>
                          {category?.name ?? 'Uncategorised'}
                        </AppText>
                        <View
                          style={[styles.track, { backgroundColor: theme.colors.surfaceMuted }]}
                        >
                          <View
                            style={[
                              styles.fill,
                              {
                                width: `${Math.max(3, Math.round(item.share * 100))}%`,
                                backgroundColor: color,
                              },
                            ]}
                          />
                        </View>
                      </View>
                      <View style={styles.legendAmount}>
                        <MoneyText amountMinor={item.total} currency={activeCurrency} />
                        <AppText variant="caption" tone="muted">
                          {Math.round(item.share * 100)}%
                        </AppText>
                      </View>
                    </PressableScale>
                  );
                })}
                {restTotal > 0 ? (
                  <View style={styles.legendRow}>
                    <IconBadge
                      icon="ellipsis-horizontal"
                      color={theme.colors.textSubtle}
                      size={36}
                    />
                    <View style={styles.legendText}>
                      <AppText variant="bodyMedium">Other categories</AppText>
                    </View>
                    <MoneyText amountMinor={restTotal} currency={activeCurrency} />
                  </View>
                ) : null}
              </View>
            </View>
          ) : (
            <EmptyState
              compact
              icon="pie-chart"
              title="No expenses this month"
              message={`Expenses in ${activeCurrency} will be grouped by category here.`}
            />
          )}
        </Card>
      </View>

      <View style={styles.section}>
        <SectionHeader title="Last six months" caption="Expenses in red, income in green" />
        <Card>
          <BarChart
            data={(report.data?.trend ?? []).map((bucket) => ({
              label: SHORT_MONTH_NAMES[bucket.month.month - 1] ?? '',
              value: bucket.expense,
              secondary: bucket.income,
              highlight: monthKey(bucket.month) === monthKey(month),
            }))}
            formatValue={compact}
          />
        </Card>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  tiles: {
    flexDirection: 'row',
    gap: 12,
  },
  tile: {
    flex: 1,
    gap: 4,
  },
  netRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  netText: {
    flex: 1,
    gap: 2,
  },
  section: {
    gap: 12,
  },
  donutLayout: {
    gap: 20,
  },
  donutWrap: {
    alignItems: 'center',
  },
  legend: {
    gap: 14,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  legendText: {
    flex: 1,
    gap: 6,
  },
  legendAmount: {
    alignItems: 'flex-end',
  },
  track: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  fill: {
    height: 6,
    borderRadius: 3,
  },
});
