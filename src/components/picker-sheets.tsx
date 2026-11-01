import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { useTheme, withAlpha } from '@/design';
import {
  type Account,
  type Category,
  type CategoryKind,
  type Currency,
  searchCurrencies,
} from '@/domain';

import { AppText } from './app-text';
import { DebtBalanceText } from './debt-balance-text';
import { BottomSheet } from './bottom-sheet';
import { TextField } from './form-row';
import { Icon } from './icon';
import { IconBadge } from './icon-badge';
import { MoneyText } from './money-text';
import { PersonAvatar } from './person-avatar';
import { PressableScale } from './pressable-scale';

type CategoryPickerProps = {
  visible: boolean;
  onClose: () => void;
  categories: Category[];
  kind: CategoryKind;
  value: string | null;
  onSelect: (category: Category) => void;
  onManage?: () => void;
};

export function CategoryPickerSheet({
  visible,
  onClose,
  categories,
  kind,
  value,
  onSelect,
  onManage,
}: CategoryPickerProps) {
  const theme = useTheme();
  const options = categories.filter((category) => category.kind === kind && !category.archivedAt);
  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={kind === 'income' ? 'Income category' : 'Category'}
      right={
        onManage ? (
          <PressableScale
            onPress={onManage}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Manage categories"
          >
            <Icon name="create" size={22} color={theme.colors.primary} outline />
          </PressableScale>
        ) : undefined
      }
    >
      <View style={styles.grid}>
        {options.map((category) => {
          const selected = category.id === value;
          return (
            <PressableScale
              key={category.id}
              onPress={() => {
                onSelect(category);
                onClose();
              }}
              haptic
              accessibilityRole="button"
              accessibilityState={{ selected }}
              style={[
                styles.tile,
                {
                  borderRadius: theme.radii.lg,
                  backgroundColor: selected
                    ? withAlpha(category.color, theme.isDark ? 0.3 : 0.14)
                    : theme.colors.surface,
                  borderColor: selected ? withAlpha(category.color, 0.6) : theme.colors.border,
                },
              ]}
            >
              <IconBadge
                icon={category.icon}
                color={category.color}
                size={40}
                outline={!selected}
                solid={selected}
              />
              <AppText variant="captionStrong" align="center" numberOfLines={2}>
                {category.name}
              </AppText>
            </PressableScale>
          );
        })}
      </View>
    </BottomSheet>
  );
}

type AccountPickerProps = {
  visible: boolean;
  onClose: () => void;
  accounts: Account[];
  /** People offered as a second section, for example "Someone else paid". */
  people?: Account[];
  peopleTitle?: string;
  peopleHint?: string;
  balances?: Map<string, Partial<Record<string, number>>>;
  currencies?: string[];
  value: string | null;
  excludeId?: string | null;
  title?: string;
  onSelect: (account: Account) => void;
};

export function AccountPickerSheet({
  visible,
  onClose,
  accounts,
  people = [],
  peopleTitle = 'People',
  peopleHint,
  balances,
  currencies = [],
  value,
  excludeId,
  title = 'Account',
  onSelect,
}: AccountPickerProps) {
  const theme = useTheme();
  const row = (account: Account, isPerson: boolean) => {
    const selected = account.id === value;
    const accountBalances = balances?.get(account.id) ?? {};
    return (
      <PressableScale
        key={account.id}
        onPress={() => {
          onSelect(account);
          onClose();
        }}
        haptic
        accessibilityRole="button"
        accessibilityState={{ selected }}
        style={[
          styles.accountRow,
          {
            borderRadius: theme.radii.lg,
            backgroundColor: selected ? theme.colors.primarySoft : theme.colors.surface,
            borderColor: selected ? withAlpha(theme.colors.primary, 0.5) : theme.colors.border,
          },
        ]}
      >
        {isPerson ? (
          <PersonAvatar name={account.name} color={account.color} size={40} />
        ) : (
          <IconBadge icon={account.icon} color={account.color} size={40} solid />
        )}
        <View style={styles.accountText}>
          <AppText variant="bodyStrong">{account.name}</AppText>
          {currencies.length > 0 ? (
            <View style={styles.balanceRow}>
              {currencies.map((currency) =>
                isPerson ? (
                  (accountBalances[currency] ?? 0) !== 0 ? (
                    <DebtBalanceText
                      key={currency}
                      balanceMinor={accountBalances[currency] ?? 0}
                      currency={currency}
                    />
                  ) : null
                ) : (
                  <MoneyText
                    key={currency}
                    amountMinor={accountBalances[currency] ?? 0}
                    currency={currency}
                    variant="amountSmall"
                    tone="muted"
                  />
                ),
              )}
            </View>
          ) : null}
        </View>
        {selected ? <Icon name="checkmark-circle" size={22} color={theme.colors.primary} /> : null}
      </PressableScale>
    );
  };
  const activePeople = people.filter((person) => !person.archivedAt && person.id !== excludeId);
  return (
    <BottomSheet visible={visible} onClose={onClose} title={title}>
      <View style={styles.list}>
        {accounts
          .filter((account) => !account.archivedAt && account.id !== excludeId)
          .map((account) => row(account, false))}
      </View>
      {activePeople.length > 0 ? (
        <View style={styles.list}>
          <View style={styles.sectionTitle}>
            <AppText variant="labelStrong">{peopleTitle}</AppText>
            {peopleHint ? (
              <AppText variant="caption" tone="muted">
                {peopleHint}
              </AppText>
            ) : null}
          </View>
          {activePeople.map((person) => row(person, true))}
        </View>
      ) : null}
    </BottomSheet>
  );
}

type PersonPickerProps = {
  visible: boolean;
  onClose: () => void;
  people: Account[];
  balances?: Map<string, Partial<Record<string, number>>>;
  currencies?: string[];
  value: string | null;
  onSelect: (person: Account) => void;
  /** Creates a person from the typed name and returns it. */
  onCreate: (name: string) => Promise<Account>;
};

/** Choose who the money was lent to or borrowed from, or add someone new by name. */
export function PersonPickerSheet({
  visible,
  onClose,
  people,
  balances,
  currencies = [],
  value,
  onSelect,
  onCreate,
}: PersonPickerProps) {
  const theme = useTheme();
  const [query, setQuery] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const trimmed = query.trim();
  const active = people.filter((person) => !person.archivedAt);
  const matches = trimmed
    ? active.filter((person) => person.name.toLowerCase().includes(trimmed.toLowerCase()))
    : active;
  const exact = active.some((person) => person.name.toLowerCase() === trimmed.toLowerCase());
  const close = () => {
    setQuery('');
    setError(null);
    onClose();
  };
  const create = async () => {
    if (!trimmed || creating) return;
    setCreating(true);
    setError(null);
    try {
      const person = await onCreate(trimmed);
      onSelect(person);
      close();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not add this person.');
    } finally {
      setCreating(false);
    }
  };
  return (
    <BottomSheet visible={visible} onClose={close} title="Person" maxHeight={0.9}>
      <TextField
        value={query}
        onChangeText={setQuery}
        placeholder="Search or type a new name"
        autoCapitalize="words"
        autoCorrect={false}
        returnKeyType="done"
        onSubmitEditing={() => {
          if (trimmed && !exact && matches.length === 0) void create();
        }}
        testID="person-search"
      />
      {trimmed && !exact ? (
        <PressableScale
          onPress={() => void create()}
          disabled={creating}
          accessibilityRole="button"
          testID="person-add"
          style={[
            styles.accountRow,
            {
              borderRadius: theme.radii.lg,
              backgroundColor: theme.colors.primarySoft,
              borderColor: withAlpha(theme.colors.primary, 0.4),
            },
          ]}
        >
          <IconBadge icon="person-add" color={theme.colors.primary} size={40} />
          <View style={styles.accountText}>
            <AppText variant="bodyStrong" tone="primary">
              {creating ? 'Adding…' : `Add \u201c${trimmed}\u201d`}
            </AppText>
            <AppText variant="caption" tone="muted">
              New person you lend to or borrow from
            </AppText>
          </View>
        </PressableScale>
      ) : null}
      {error ? (
        <AppText variant="caption" tone="danger">
          {error}
        </AppText>
      ) : null}
      <View style={styles.list}>
        {matches.map((person) => {
          const selected = person.id === value;
          const personBalances = balances?.get(person.id) ?? {};
          const owing = currencies.filter((currency) => (personBalances[currency] ?? 0) !== 0);
          return (
            <PressableScale
              key={person.id}
              onPress={() => {
                onSelect(person);
                close();
              }}
              haptic
              accessibilityRole="button"
              accessibilityState={{ selected }}
              style={[
                styles.accountRow,
                {
                  borderRadius: theme.radii.lg,
                  backgroundColor: selected ? theme.colors.primarySoft : theme.colors.surface,
                  borderColor: selected
                    ? withAlpha(theme.colors.primary, 0.5)
                    : theme.colors.border,
                },
              ]}
            >
              <PersonAvatar name={person.name} color={person.color} size={40} />
              <View style={styles.accountText}>
                <AppText variant="bodyStrong">{person.name}</AppText>
                {owing.length > 0 ? (
                  <View style={styles.balanceRow}>
                    {owing.map((currency) => (
                      <DebtBalanceText
                        key={currency}
                        balanceMinor={personBalances[currency] ?? 0}
                        currency={currency}
                      />
                    ))}
                  </View>
                ) : (
                  <AppText variant="caption" tone="subtle">
                    Settled
                  </AppText>
                )}
              </View>
              {selected ? (
                <Icon name="checkmark-circle" size={22} color={theme.colors.primary} />
              ) : null}
            </PressableScale>
          );
        })}
        {active.length === 0 && !trimmed ? (
          <AppText variant="caption" tone="muted" align="center">
            Type a name above to add the first person.
          </AppText>
        ) : null}
      </View>
    </BottomSheet>
  );
}

type CurrencyPickerProps = {
  visible: boolean;
  onClose: () => void;
  value: string | null;
  disabledCodes?: string[];
  onSelect: (currency: Currency) => void;
  title?: string;
};

export function CurrencyPickerSheet({
  visible,
  onClose,
  value,
  disabledCodes = [],
  onSelect,
  title = 'Choose a currency',
}: CurrencyPickerProps) {
  const theme = useTheme();
  const [query, setQuery] = useState('');
  const results = useMemo(() => searchCurrencies(query), [query]);
  return (
    <BottomSheet
      visible={visible}
      onClose={() => {
        setQuery('');
        onClose();
      }}
      title={title}
      maxHeight={0.9}
    >
      <TextField
        value={query}
        onChangeText={setQuery}
        placeholder="Search by code, name or country"
        autoCapitalize="characters"
        autoCorrect={false}
        clearButtonMode="while-editing"
      />
      <View style={styles.list}>
        {results.map((currency) => {
          const selected = currency.code === value;
          const disabled = disabledCodes.includes(currency.code) && !selected;
          return (
            <PressableScale
              key={currency.code}
              disabled={disabled}
              onPress={() => {
                onSelect(currency);
                setQuery('');
                onClose();
              }}
              accessibilityRole="button"
              accessibilityState={{ selected, disabled }}
              style={[
                styles.currencyRow,
                {
                  borderRadius: theme.radii.lg,
                  backgroundColor: selected ? theme.colors.primarySoft : theme.colors.surface,
                  borderColor: selected
                    ? withAlpha(theme.colors.primary, 0.5)
                    : theme.colors.border,
                },
              ]}
            >
              <View
                style={[
                  styles.codeBadge,
                  { backgroundColor: theme.colors.surfaceMuted, borderRadius: theme.radii.md },
                ]}
              >
                <AppText variant="labelStrong">{currency.code}</AppText>
              </View>
              <View style={styles.accountText}>
                <AppText variant="bodyMedium">{currency.name}</AppText>
                <AppText variant="caption" tone="muted">
                  {currency.region} · {currency.symbol}
                </AppText>
              </View>
              {selected ? (
                <Icon name="checkmark-circle" size={22} color={theme.colors.primary} />
              ) : null}
            </PressableScale>
          );
        })}
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingBottom: 12,
  },
  tile: {
    width: '30.5%',
    flexGrow: 1,
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderWidth: 1,
  },
  list: {
    gap: 8,
    paddingBottom: 12,
  },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderWidth: 1,
  },
  accountText: {
    flex: 1,
    gap: 2,
  },
  sectionTitle: {
    gap: 2,
    marginTop: 4,
  },
  balanceRow: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  currencyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 10,
    borderWidth: 1,
  },
  codeBadge: {
    width: 56,
    paddingVertical: 8,
    alignItems: 'center',
  },
});
