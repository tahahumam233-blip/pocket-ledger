import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Chip } from '@/components/chip';
import { Icon } from '@/components/icon';
import { MoneyText } from '@/components/money-text';
import { PersonAvatar } from '@/components/person-avatar';
import { PressableScale } from '@/components/pressable-scale';
import { useTheme } from '@/design';
import { type Account, formatAmountDraft, getCurrency } from '@/domain';

export type SplitRow = { person: Account | undefined; draft: string; active: boolean };

type SplitCardProps = {
  currency: string;
  rows: SplitRow[];
  /** What is left as your own expense after the shares. */
  ownMinor: number;
  totalMinor: number;
  onFocus: (index: number) => void;
  onRemove: (index: number) => void;
  onAdd: () => void;
  onSplitEqually: () => void;
  /** Offered when nothing is left for you and one party is in the split. */
  onPostAsLoan?: () => void;
};

/**
 * The parties an expense was partly paid for. Each share is typed on the keypad and
 * becomes a receivable from that party; the rest stays your expense.
 */
export function SplitCard({
  currency,
  rows,
  ownMinor,
  totalMinor,
  onFocus,
  onRemove,
  onAdd,
  onSplitEqually,
  onPostAsLoan,
}: SplitCardProps) {
  const theme = useTheme();
  const info = getCurrency(currency);
  const nothingLeft = totalMinor > 0 && ownMinor <= 0;

  return (
    <View style={styles.wrap} testID="split-card">
      <View style={styles.header}>
        <AppText variant="labelStrong">Split</AppText>
        <Chip label="Split equally" icon="people" size="sm" onPress={onSplitEqually} />
      </View>
      <Card padded={false}>
        {rows.map((row, index) => {
          const text = formatAmountDraft(row.draft) || '0';
          return (
            <View
              key={row.person?.id ?? index}
              style={[styles.row, { borderBottomColor: theme.colors.border }]}
            >
              {row.person ? (
                <PersonAvatar name={row.person.name} color={row.person.color} size={32} />
              ) : null}
              <View style={styles.rowText}>
                <AppText variant="bodyMedium" numberOfLines={1}>
                  {row.person?.name ?? 'Party'}
                </AppText>
                <AppText variant="caption" tone="muted">
                  Receivable
                </AppText>
              </View>
              <PressableScale
                onPress={() => onFocus(index)}
                accessibilityRole="button"
                accessibilityLabel={`${row.person?.name ?? 'Party'} share ${text} ${currency}`}
                aria-selected={row.active}
                testID={`split-share-${index}`}
                style={[
                  styles.amount,
                  {
                    borderRadius: theme.radii.md,
                    borderColor: row.active ? theme.colors.primary : theme.colors.border,
                    borderWidth: row.active ? 2 : StyleSheet.hairlineWidth,
                    backgroundColor: row.active ? theme.colors.primarySoft : theme.colors.surface,
                  },
                ]}
              >
                <AppText variant="amount" tone={row.draft ? 'text' : 'subtle'} numberOfLines={1}>
                  {info.symbolPosition === 'before'
                    ? `${info.symbol}${text}`
                    : `${text} ${info.code}`}
                </AppText>
              </PressableScale>
              <PressableScale
                onPress={() => onRemove(index)}
                accessibilityRole="button"
                accessibilityLabel={`Remove ${row.person?.name ?? 'party'} from the split`}
                hitSlop={8}
              >
                <Icon name="close-circle" size={22} color={theme.colors.textSubtle} />
              </PressableScale>
            </View>
          );
        })}
        <View style={[styles.row, styles.ownRow, { backgroundColor: theme.colors.surfaceMuted }]}>
          <Icon name="person-circle" size={32} color={theme.colors.textMuted} />
          <View style={styles.rowText}>
            <AppText variant="bodyMedium">Your expense</AppText>
            <AppText variant="caption" tone="muted">
              Counts in Reports
            </AppText>
          </View>
          <MoneyText
            amountMinor={ownMinor}
            currency={currency}
            variant="amount"
            tone={nothingLeft ? 'danger' : 'text'}
            testID="split-own"
          />
        </View>
      </Card>

      <View style={styles.inline}>
        <Chip label="Add another party" icon="person-add" size="sm" onPress={onAdd} />
      </View>

      {nothingLeft ? (
        <View
          style={[
            styles.notice,
            { backgroundColor: theme.colors.warningSoft, borderRadius: theme.radii.md },
          ]}
        >
          <AppText variant="caption" tone="warning">
            The shares cover the whole payment, so nothing is left as your expense. A payment only
            for someone else is a loan given.
          </AppText>
          {onPostAsLoan ? (
            <Button
              label={`Post as loan given to ${rows[0]?.person?.name ?? 'party'}`}
              icon="arrow-up-circle"
              variant="secondary"
              size="sm"
              onPress={onPostAsLoan}
            />
          ) : null}
        </View>
      ) : (
        <AppText variant="caption" tone="muted">
          Each share is debited to that party as a receivable. Only your part counts as an expense.
        </AppText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  ownRow: {
    borderBottomWidth: 0,
  },
  rowText: {
    flex: 1,
    gap: 1,
  },
  amount: {
    minWidth: 96,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignItems: 'flex-end',
  },
  inline: {
    flexDirection: 'row',
  },
  notice: {
    padding: 12,
    gap: 10,
  },
});
