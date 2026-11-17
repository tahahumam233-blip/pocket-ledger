import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { CurrencyToggle } from '@/components/currency-toggle';
import { IconBadge } from '@/components/icon-badge';
import { MoneyText } from '@/components/money-text';
import { MonthSwitcher } from '@/components/month-switcher';
import { Screen } from '@/components/screen';
import { SectionHeader } from '@/components/section-header';
import { useTheme } from '@/design';
import { currentYearMonth, monthKey, type YearMonth } from '@/domain';
import { BudgetCategoryRow } from '@/features/budgets/budget-category-row';
import { BudgetSheet, type BudgetSheetTarget } from '@/features/budgets/budget-sheet';
import { BudgetSummary } from '@/features/budgets/budget-summary';
import { haptics } from '@/platform/haptics';
import { useLedgerStore } from '@/state/ledger-store';
import { showToast } from '@/state/toast-store';
import { useQuery } from '@/state/use-query';

type Editing = BudgetSheetTarget & { categoryId: string | null };

export default function BudgetsScreen() {
  const theme = useTheme();
  const snapshot = useLedgerStore((state) => state.snapshot);
  const mutate = useLedgerStore((state) => state.mutate);
  const currencies = useMemo(
    () => snapshot?.settings.currencies ?? [],
    [snapshot?.settings.currencies],
  );
  const [month, setMonth] = useState<YearMonth>(() => currentYearMonth());
  const [currencyChoice, setCurrency] = useState<string | null>(null);
  const currency = currencyChoice ?? currencies[0] ?? 'USD';
  const [editing, setEditing] = useState<Editing | null>(null);

  const overview = useQuery(
    (s) => s.queries.budgetOverview(month, currency),
    [monthKey(month), currency],
  );
  const data = overview.data;

  const edit = (row: NonNullable<typeof data>['overall'], title: string) => {
    if (!data) return;
    setEditing({
      categoryId: row.category?.id ?? null,
      title,
      currency,
      amountMinor: row.budget?.amountMinor ?? null,
      spentMinor: row.spentMinor,
      suggestionMinor: row.suggestionMinor,
      suggestionDays: data.suggestionDays,
    });
  };

  const save = async (amountMinor: number) => {
    if (!editing) return;
    try {
      await mutate((s) =>
        s.setup.setBudget({ categoryId: editing.categoryId, currency, amountMinor }),
      );
      haptics.success();
      showToast(`${editing.title} budget saved.`, { tone: 'success' });
      setEditing(null);
    } catch (caught) {
      showToast(caught instanceof Error ? caught.message : 'Could not save.', { tone: 'danger' });
    }
  };

  const remove = async () => {
    if (!editing) return;
    await mutate((s) => s.setup.removeBudget(editing.categoryId, currency));
    showToast(`${editing.title} budget removed.`);
    setEditing(null);
  };

  const overall = data?.overall;
  const budgeted = data?.categories.filter((row) => row.progress) ?? [];
  const others = data?.categories.filter((row) => !row.progress) ?? [];

  return (
    <Screen
      header={{
        title: 'Budgets',
        back: true,
        large: true,
        subtitle: 'Monthly limits. Spending starts again on the 1st.',
      }}
    >
      <MonthSwitcher value={month} onChange={setMonth} />
      {currencies.length > 1 ? (
        <CurrencyToggle currencies={currencies} value={currency} onChange={setCurrency} size="md" />
      ) : null}

      {overall ? (
        <Card
          onPress={() => edit(overall, 'All expenses')}
          accessibilityLabel="All expenses budget"
          testID="budget-overall"
        >
          <View style={styles.overallHead}>
            <IconBadge icon="wallet" color={theme.colors.primary} size={40} />
            <View style={styles.flex}>
              <AppText variant="bodyStrong">All expenses</AppText>
              <AppText variant="caption" tone="muted">
                Everything you spend in {currency}
              </AppText>
            </View>
          </View>
          {overall.progress ? (
            <BudgetSummary progress={overall.progress} currency={currency} prominent />
          ) : (
            <View style={styles.empty}>
              <AppText variant="caption" tone="muted">
                {overall.spentMinor > 0 ? (
                  <>
                    <MoneyText
                      amountMinor={overall.spentMinor}
                      currency={currency}
                      variant="captionStrong"
                    />
                    {' spent this month. '}
                  </>
                ) : null}
                Set one limit for all your spending to see how much is left each day.
              </AppText>
              <Button
                label="Set a monthly budget"
                icon="add-circle"
                variant="soft"
                onPress={() => edit(overall, 'All expenses')}
                fullWidth
              />
            </View>
          )}
        </Card>
      ) : null}

      {data && data.categoryBudgetsMinor > 0 ? (
        <AppText variant="caption" tone="muted" align="center">
          Category budgets add up to{' '}
          <MoneyText
            amountMinor={data.categoryBudgetsMinor}
            currency={currency}
            variant="captionStrong"
          />
          {overall?.budget ? (
            <>
              {' of '}
              <MoneyText
                amountMinor={overall.budget.amountMinor}
                currency={currency}
                variant="caption"
                tone="muted"
              />
            </>
          ) : null}
          .
        </AppText>
      ) : null}

      {budgeted.length > 0 ? (
        <View style={styles.section}>
          <SectionHeader title="Category budgets" />
          <Card padded={false}>
            {budgeted.map((row, index) =>
              row.category ? (
                <BudgetCategoryRow
                  key={row.category.id}
                  category={row.category}
                  currency={currency}
                  spentMinor={row.spentMinor}
                  progress={row.progress}
                  onPress={() => edit(row, row.category?.name ?? 'Category')}
                  last={index === budgeted.length - 1}
                />
              ) : null,
            )}
          </Card>
        </View>
      ) : null}

      {others.length > 0 ? (
        <View style={styles.section}>
          <SectionHeader
            title={budgeted.length > 0 ? 'Other categories' : 'Categories'}
            caption="Tap one to give it its own budget."
          />
          <Card padded={false}>
            {others.map((row, index) =>
              row.category ? (
                <BudgetCategoryRow
                  key={row.category.id}
                  category={row.category}
                  currency={currency}
                  spentMinor={row.spentMinor}
                  progress={null}
                  onPress={() => edit(row, row.category?.name ?? 'Category')}
                  last={index === others.length - 1}
                />
              ) : null,
            )}
          </Card>
        </View>
      ) : null}

      <BudgetSheet
        target={editing}
        onClose={() => setEditing(null)}
        onSave={save}
        onRemove={remove}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  overallHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  flex: {
    flex: 1,
  },
  empty: {
    gap: 12,
  },
  section: {
    gap: 8,
  },
});
