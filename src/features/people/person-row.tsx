import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { DebtBalanceText } from '@/components/debt-balance-text';
import { Icon } from '@/components/icon';
import { PersonAvatar } from '@/components/person-avatar';
import { PressableScale } from '@/components/pressable-scale';
import { useTheme } from '@/design';
import { type Account, describeDue, type IsoDate } from '@/domain';

type PersonRowProps = {
  person: Account;
  balances: Partial<Record<string, number>>;
  currencies: string[];
  today: IsoDate;
  onPress: () => void;
  last?: boolean;
};

/** One person with what they owe or what you owe them, per currency. */
export function PersonRow({ person, balances, currencies, today, onPress, last }: PersonRowProps) {
  const theme = useTheme();
  const owing = currencies.filter((currency) => (balances[currency] ?? 0) !== 0);
  const due = describeDue(person.dueDate, today, owing.length > 0);
  return (
    <PressableScale
      onPress={onPress}
      scaleTo={0.995}
      accessibilityRole="button"
      accessibilityLabel={`${person.name}`}
      pressedStyle={{ backgroundColor: theme.colors.surfaceMuted }}
      style={[
        styles.row,
        {
          borderBottomColor: theme.colors.border,
          borderBottomWidth: last ? 0 : StyleSheet.hairlineWidth,
        },
      ]}
    >
      <PersonAvatar name={person.name} color={person.color} size={44} />
      <View style={styles.text}>
        <AppText variant="bodyMedium" numberOfLines={1}>
          {person.name}
          {person.archivedAt ? ' (archived)' : ''}
        </AppText>
        {due ? (
          <AppText variant="caption" tone={due.overdue ? 'danger' : 'muted'} numberOfLines={1}>
            {due.label}
          </AppText>
        ) : person.note ? (
          <AppText variant="caption" tone="muted" numberOfLines={1}>
            {person.note}
          </AppText>
        ) : null}
      </View>
      <View style={styles.amounts}>
        {owing.length > 0 ? (
          owing.map((currency) => (
            <DebtBalanceText
              key={currency}
              balanceMinor={balances[currency] ?? 0}
              currency={currency}
              variant="amountSmall"
              align="right"
            />
          ))
        ) : (
          <AppText variant="amountSmall" tone="subtle">
            Settled
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
    gap: 2,
  },
  amounts: {
    alignItems: 'flex-end',
    gap: 2,
    maxWidth: '50%',
  },
});
