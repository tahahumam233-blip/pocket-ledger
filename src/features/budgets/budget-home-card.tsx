import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Card } from '@/components/card';
import { Icon } from '@/components/icon';
import { IconBadge } from '@/components/icon-badge';
import { useTheme } from '@/design';
import type { BudgetLine } from '@/application';

import { BudgetSummary } from './budget-summary';

/** How many category budgets Home shows under the overall ones. */
const CATEGORY_LINES = 3;

type BudgetHomeCardProps = {
  budgets: readonly BudgetLine[];
  currencies: readonly string[];
  onPress: () => void;
};

/**
 * This month's budgets on Home: every overall budget, then the category budgets
 * that need the most attention. With no budgets it invites the user to set one.
 */
export function BudgetHomeCard({ budgets, currencies, onPress }: BudgetHomeCardProps) {
  const theme = useTheme();

  if (budgets.length === 0) {
    return (
      <Card onPress={onPress} accessibilityLabel="Set a monthly budget" testID="budget-invite">
        <View style={styles.bannerRow}>
          <IconBadge icon="pie-chart" color={theme.colors.primary} size={40} outline />
          <View style={styles.bannerText}>
            <AppText variant="bodyStrong">Set a monthly budget</AppText>
            <AppText variant="caption" tone="muted">
              See what is left to spend this month, and how much a day.
            </AppText>
          </View>
          <Icon name="chevron-forward" size={18} color={theme.colors.textMuted} />
        </View>
      </Card>
    );
  }

  const overall = budgets.filter((line) => line.category === null);
  const categories = budgets.filter((line) => line.category !== null).slice(0, CATEGORY_LINES);
  const shown = [...overall, ...categories];
  const twoCurrencies = currencies.length > 1;

  return (
    <Card padded={false} onPress={onPress} accessibilityLabel="Budgets" testID="budget-home">
      {shown.map((line, index) => {
        const title = line.category ? line.category.name : 'All expenses';
        return (
          <View
            key={line.budget.id}
            style={[
              styles.line,
              index < shown.length - 1
                ? {
                    borderBottomColor: theme.colors.border,
                    borderBottomWidth: StyleSheet.hairlineWidth,
                  }
                : null,
            ]}
          >
            <View style={styles.titleRow}>
              {line.category ? (
                <IconBadge
                  icon={line.category.icon}
                  color={line.category.color}
                  size={24}
                  outline
                />
              ) : null}
              <AppText
                variant={line.category ? 'label' : 'bodyStrong'}
                numberOfLines={1}
                style={styles.flex}
              >
                {title}
              </AppText>
              {twoCurrencies ? (
                <AppText variant="micro" tone="subtle">
                  {line.budget.currency}
                </AppText>
              ) : null}
            </View>
            <BudgetSummary
              progress={line.progress}
              currency={line.budget.currency}
              prominent={line.category === null}
            />
          </View>
        );
      })}
    </Card>
  );
}

const styles = StyleSheet.create({
  bannerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  bannerText: {
    flex: 1,
    gap: 2,
  },
  line: {
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  flex: {
    flex: 1,
  },
});
