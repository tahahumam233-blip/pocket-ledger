import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { MoneyText } from '@/components/money-text';
import { ProgressBar } from '@/components/progress-bar';
import { type ThemeColors, useTheme } from '@/design';
import { BUDGET_STATUS_TEXT, type BudgetProgress, type BudgetStatus } from '@/domain';

export const BUDGET_STATUS_LABEL = BUDGET_STATUS_TEXT;

export function budgetStatusColor(status: BudgetStatus, colors: ThemeColors): string {
  return status === 'over' ? colors.danger : status === 'ahead' ? colors.warning : colors.income;
}

type BudgetSummaryProps = {
  progress: BudgetProgress;
  currency: string;
  /** Larger figures, for the budget that covers all expenses. */
  prominent?: boolean;
};

/**
 * A budget's bar and the sentence under it: what is spent of the budget, and
 * either what is left a day or how far over it went.
 */
export function BudgetSummary({ progress, currency, prominent = false }: BudgetSummaryProps) {
  const theme = useTheme();
  const color = budgetStatusColor(progress.status, theme.colors);
  const marker =
    progress.daysLeft > 0 && progress.daysLeft < progress.daysInMonth
      ? progress.expectedMinor / progress.budgetMinor
      : null;
  const finished = progress.perDayLeftMinor === null;
  return (
    <View style={styles.wrap}>
      <View style={styles.figures}>
        <AppText variant={prominent ? 'bodyStrong' : 'label'} style={styles.flex}>
          <MoneyText
            amountMinor={progress.spentMinor}
            currency={currency}
            variant={prominent ? 'amountMedium' : 'amountSmall'}
          />
          <AppText variant="caption" tone="muted">
            {'  of '}
          </AppText>
          <MoneyText
            amountMinor={progress.budgetMinor}
            currency={currency}
            variant="caption"
            tone="muted"
          />
        </AppText>
        <AppText variant="captionStrong" color={color}>
          {BUDGET_STATUS_LABEL[progress.status]}
        </AppText>
      </View>
      <ProgressBar
        ratio={progress.ratio}
        color={color}
        marker={marker}
        height={prominent ? 10 : 6}
        accessibilityLabel={BUDGET_STATUS_LABEL[progress.status]}
      />
      <AppText variant="caption" tone="muted">
        {progress.remainingMinor < 0 ? (
          <>
            {'Over by '}
            <MoneyText
              amountMinor={-progress.remainingMinor}
              currency={currency}
              variant="captionStrong"
              tone="danger"
            />
          </>
        ) : (
          <>
            <MoneyText
              amountMinor={progress.remainingMinor}
              currency={currency}
              variant="captionStrong"
            />
            {' left'}
          </>
        )}
        {!finished && progress.remainingMinor > 0 ? (
          <>
            {' · '}
            <MoneyText
              amountMinor={progress.perDayLeftMinor ?? 0}
              currency={currency}
              variant="caption"
              tone="muted"
            />
            {` a day for ${progress.daysLeft} ${progress.daysLeft === 1 ? 'day' : 'days'}`}
          </>
        ) : null}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 6,
  },
  figures: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 8,
  },
  flex: {
    flex: 1,
  },
});
