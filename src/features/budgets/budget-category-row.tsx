import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Icon } from '@/components/icon';
import { IconBadge } from '@/components/icon-badge';
import { MoneyText } from '@/components/money-text';
import { PressableScale } from '@/components/pressable-scale';
import { useTheme } from '@/design';
import type { BudgetProgress, Category } from '@/domain';

import { BudgetSummary } from './budget-summary';

type BudgetCategoryRowProps = {
  category: Category;
  currency: string;
  spentMinor: number;
  progress: BudgetProgress | null;
  onPress: () => void;
  last?: boolean;
};

/** A category with its budget bar, or what it has cost this month when it has no budget. */
export function BudgetCategoryRow({
  category,
  currency,
  spentMinor,
  progress,
  onPress,
  last,
}: BudgetCategoryRowProps) {
  const theme = useTheme();
  return (
    <PressableScale
      onPress={onPress}
      scaleTo={0.995}
      accessibilityRole="button"
      accessibilityLabel={`${category.name} budget`}
      pressedStyle={{ backgroundColor: theme.colors.surfaceMuted }}
      testID={`budget-row-${category.name}`}
      style={[
        styles.row,
        {
          borderBottomColor: theme.colors.border,
          borderBottomWidth: last ? 0 : StyleSheet.hairlineWidth,
        },
      ]}
    >
      <IconBadge icon={category.icon} color={category.color} size={38} outline />
      <View style={styles.text}>
        <View style={styles.titleRow}>
          <AppText variant="bodyMedium" numberOfLines={1} style={styles.title}>
            {category.name}
          </AppText>
          {progress ? null : (
            <AppText variant="captionStrong" tone="primary">
              Set budget
            </AppText>
          )}
        </View>
        {progress ? (
          <BudgetSummary progress={progress} currency={currency} />
        ) : (
          <AppText variant="caption" tone="muted">
            {spentMinor > 0 ? (
              <>
                <MoneyText
                  amountMinor={spentMinor}
                  currency={currency}
                  variant="caption"
                  tone="muted"
                />
                {' spent this month'}
              </>
            ) : (
              'Nothing spent this month'
            )}
          </AppText>
        )}
      </View>
      <Icon name="chevron-forward" size={16} color={theme.colors.textSubtle} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  text: {
    flex: 1,
    gap: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    flex: 1,
  },
});
