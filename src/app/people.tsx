import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Chip } from '@/components/chip';
import { EmptyState } from '@/components/empty-state';
import { TextField } from '@/components/form-row';
import { Icon } from '@/components/icon';
import { PressableScale } from '@/components/pressable-scale';
import { Screen } from '@/components/screen';
import { useTheme } from '@/design';
import { debtStanding } from '@/domain';
import { DebtSummary } from '@/features/people/debt-summary';
import { PersonRow } from '@/features/people/person-row';
import { useLedgerStore } from '@/state/ledger-store';
import { useQuery } from '@/state/use-query';

type Filter = 'all' | 'owes_you' | 'you_owe' | 'settled';

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'owes_you', label: 'Owe you' },
  { value: 'you_owe', label: 'You owe' },
  { value: 'settled', label: 'Settled' },
];

export default function PeopleScreen() {
  const theme = useTheme();
  const router = useRouter();
  const snapshot = useLedgerStore((state) => state.snapshot);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [showArchived, setShowArchived] = useState(false);
  const people = useQuery((s) => s.queries.people({ includeArchived: true }), []);
  const currencies = useMemo(
    () => snapshot?.settings.currencies ?? [],
    [snapshot?.settings.currencies],
  );
  const today = snapshot?.today ?? '';

  const archivedCount = (people.data ?? []).filter((entry) => entry.account.archivedAt).length;
  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return (people.data ?? [])
      .filter((entry) => showArchived || !entry.account.archivedAt)
      .filter((entry) => !needle || entry.account.name.toLowerCase().includes(needle))
      .filter((entry) => {
        if (filter === 'all') return true;
        const standings = currencies.map((currency) => debtStanding(entry.balances[currency] ?? 0));
        if (filter === 'settled') return standings.every((standing) => standing === 'settled');
        return standings.includes(filter);
      })
      .sort((a, b) => {
        const weight = (balances: Partial<Record<string, number>>) =>
          Math.abs(balances[currencies[0] ?? ''] ?? 0);
        return (
          weight(b.balances) - weight(a.balances) || a.account.name.localeCompare(b.account.name)
        );
      });
  }, [people.data, search, filter, showArchived, currencies]);

  const addPerson = () => router.push({ pathname: '/person/edit/[id]', params: { id: 'new' } });

  return (
    <Screen
      header={{
        title: 'People',
        back: true,
        large: true,
        subtitle: 'Money you lend and borrow, with a statement for each person.',
        right: (
          <PressableScale
            onPress={addPerson}
            accessibilityRole="button"
            accessibilityLabel="Add a person"
            hitSlop={8}
            testID="add-person"
          >
            <Icon name="person-add" size={24} color={theme.colors.primary} outline />
          </PressableScale>
        ),
      }}
    >
      {snapshot ? <DebtSummary totals={snapshot.debts} currencies={currencies} /> : null}

      {(people.data ?? []).length === 0 && people.data ? (
        <EmptyState
          icon="people"
          title="No one yet"
          message="Add the people you lend money to or borrow from. Each one gets a running balance and a statement of account."
          actionLabel="Add a person"
          onAction={addPerson}
        />
      ) : (
        <>
          <TextField
            value={search}
            onChangeText={setSearch}
            placeholder="Search people"
            autoCorrect={false}
            clearButtonMode="while-editing"
          />
          <View style={styles.chips}>
            {FILTERS.map((option) => (
              <Chip
                key={option.value}
                label={option.label}
                selected={filter === option.value}
                onPress={() => setFilter(option.value)}
              />
            ))}
          </View>
          {visible.length > 0 ? (
            <Card padded={false}>
              {visible.map((entry, index) => (
                <PersonRow
                  key={entry.account.id}
                  person={entry.account}
                  balances={entry.balances}
                  currencies={currencies}
                  today={today}
                  last={index === visible.length - 1}
                  onPress={() =>
                    router.push({ pathname: '/person/[id]', params: { id: entry.account.id } })
                  }
                />
              ))}
            </Card>
          ) : (
            <AppText tone="muted" align="center">
              No one matches.
            </AppText>
          )}
          <Button
            label="Add a person"
            icon="person-add"
            variant="soft"
            onPress={addPerson}
            fullWidth
          />
          {archivedCount > 0 ? (
            <View style={styles.archived}>
              <Chip
                label={showArchived ? 'Hide archived' : `Show archived (${archivedCount})`}
                size="sm"
                onPress={() => setShowArchived((value) => !value)}
              />
            </View>
          ) : null}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  archived: {
    alignItems: 'center',
  },
});
