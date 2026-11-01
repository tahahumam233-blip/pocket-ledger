import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { CurrencyToggle } from '@/components/currency-toggle';
import { DueDateField } from '@/components/due-date-field';
import { EmptyState } from '@/components/empty-state';
import { Field, TextField } from '@/components/form-row';
import { PersonAvatar } from '@/components/person-avatar';
import { PressableScale } from '@/components/pressable-scale';
import { Screen } from '@/components/screen';
import { SegmentedControl } from '@/components/segmented-control';
import { useTheme } from '@/design';
import { type Account, COLOR_CHOICES, getCurrency, type IsoDate, parseAmount } from '@/domain';
import { askConfirm } from '@/platform/confirm';
import { haptics } from '@/platform/haptics';
import { useLedgerStore } from '@/state/ledger-store';
import { showToast } from '@/state/toast-store';
import { useQuery } from '@/state/use-query';

type Starting = 'none' | 'owes_me' | 'i_owe';

export default function PersonFormScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === 'new';
  const existing = useQuery(
    (s) => (isNew ? Promise.resolve(null) : s.repos.accounts.getById(id)),
    [id],
  );
  if (isNew) return <PersonForm key="new" person={null} />;
  if (!existing.data && existing.loading)
    return <Screen header={{ title: 'Edit party', close: true }} />;
  if (!existing.data || existing.data.accountClass !== 'person') {
    return (
      <Screen header={{ title: 'Edit party', close: true }}>
        <EmptyState icon="person" title="Party not found" message="They may have been removed." />
      </Screen>
    );
  }
  return <PersonForm key={existing.data.id} person={existing.data} />;
}

function PersonForm({ person }: { person: Account | null }) {
  const theme = useTheme();
  const router = useRouter();
  const mutate = useLedgerStore((state) => state.mutate);
  const currencies = useLedgerStore((state) => state.settings.currencies);
  const isNew = person === null;
  const [name, setName] = useState(person?.name ?? '');
  const [note, setNote] = useState(person?.note ?? '');
  const [dueDate, setDueDate] = useState<IsoDate | null>(person?.dueDate ?? null);
  const [color, setColor] = useState(person?.color ?? COLOR_CHOICES[9] ?? '#5B5BD6');
  const [starting, setStarting] = useState<Starting>('none');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState(currencies[0] ?? 'USD');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const close = () => (router.canGoBack() ? router.back() : router.replace('/people'));

  const save = async () => {
    setError(null);
    let startingBalance: { currency: string; amountMinor: number } | undefined;
    if (isNew && starting !== 'none') {
      const parsed = parseAmount(amount, getCurrency(currency).fractionDigits);
      if (!parsed.ok || parsed.minor <= 0) {
        setError('Enter the opening balance amount, or choose "None".');
        return;
      }
      startingBalance = {
        currency,
        amountMinor: starting === 'owes_me' ? parsed.minor : -parsed.minor,
      };
    }
    setSaving(true);
    try {
      if (person) {
        await mutate((s) => s.setup.updatePerson(person.id, { name, note, dueDate, color }));
        showToast('Saved.', { tone: 'success' });
        close();
      } else {
        const created = await mutate((s) =>
          s.setup.createPerson({ name, note, dueDate, color, startingBalance }),
        );
        haptics.success();
        showToast(`${created.name} added.`, { tone: 'success' });
        router.replace({ pathname: '/person/[id]', params: { id: created.id } });
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not save.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!person) return;
    const confirmed = await askConfirm({
      title: `Remove ${person.name}?`,
      message:
        'If there are entries with them, they are archived instead, so balances and statements stay correct.',
      confirmLabel: 'Remove',
      destructive: true,
    });
    if (!confirmed) return;
    try {
      const result = await mutate((s) => s.setup.removeAccount(person.id));
      showToast(result === 'archived' ? `${person.name} archived.` : `${person.name} removed.`);
      router.replace('/people');
    } catch (caught) {
      showToast(caught instanceof Error ? caught.message : 'Could not remove.', { tone: 'danger' });
    }
  };

  const restore = async () => {
    if (!person) return;
    await mutate((s) => s.setup.restoreAccount(person.id));
    showToast(`${person.name} restored.`, { tone: 'success' });
    close();
  };

  return (
    <Screen
      header={{
        title: isNew ? 'New party' : 'Edit party',
        close: true,
        right: (
          <Button
            label={saving ? 'Saving' : 'Save'}
            size="sm"
            onPress={() => void save()}
            loading={saving}
            disabled={!name.trim()}
            testID="save-person"
          />
        ),
      }}
      edges={['top', 'bottom']}
      keyboard
    >
      <View style={styles.preview}>
        <PersonAvatar name={name || '?'} color={color} size={72} />
      </View>
      <Field label="Name">
        <TextField
          value={name}
          onChangeText={setName}
          placeholder="e.g. Ali, Sara, Uncle Omar"
          autoCapitalize="words"
          returnKeyType="done"
          testID="person-name"
        />
      </Field>
      <Field label="Note" hint="Contact details or reference (optional)">
        <TextField
          value={note}
          onChangeText={setNote}
          placeholder="Optional"
          returnKeyType="done"
        />
      </Field>

      {isNew ? (
        <Field
          label="Opening balance"
          hint="Balance brought forward from before you started this ledger."
        >
          <SegmentedControl
            options={[
              { value: 'none', label: 'None' },
              { value: 'owes_me', label: 'Receivable', color: theme.colors.income },
              { value: 'i_owe', label: 'Payable', color: theme.colors.expense },
            ]}
            value={starting}
            onChange={(next: Starting) => setStarting(next)}
            size="sm"
          />
          {starting !== 'none' ? (
            <View style={styles.startingRow}>
              <View style={styles.amountField}>
                <TextField
                  value={amount}
                  onChangeText={setAmount}
                  placeholder="0"
                  keyboardType="decimal-pad"
                  inputMode="decimal"
                  testID="person-starting-amount"
                />
              </View>
              {currencies.length > 1 ? (
                <View style={styles.currency}>
                  <CurrencyToggle currencies={currencies} value={currency} onChange={setCurrency} />
                </View>
              ) : null}
            </View>
          ) : null}
        </Field>
      ) : null}

      <Field
        label="Due date"
        hint="Optional. Shows the days remaining, and flags the balance when overdue."
      >
        <DueDateField value={dueDate} onChange={setDueDate} />
      </Field>

      <Field label="Colour">
        <View style={styles.swatches}>
          {COLOR_CHOICES.map((choice) => (
            <PressableScale
              key={choice}
              onPress={() => setColor(choice)}
              accessibilityRole="radio"
              accessibilityState={{ selected: choice === color }}
              style={[
                styles.swatch,
                {
                  backgroundColor: choice,
                  borderColor: choice === color ? theme.colors.text : 'transparent',
                },
              ]}
            />
          ))}
        </View>
      </Field>

      {error ? (
        <AppText variant="label" tone="danger">
          {error}
        </AppText>
      ) : null}

      {person ? (
        person.archivedAt ? (
          <Button
            label="Restore party"
            icon="refresh"
            variant="soft"
            onPress={() => void restore()}
            fullWidth
          />
        ) : (
          <Button
            label="Remove party"
            icon="trash"
            variant="danger"
            onPress={() => void remove()}
            fullWidth
          />
        )
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  preview: {
    alignItems: 'center',
  },
  startingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  amountField: {
    flex: 1,
  },
  currency: {
    width: 150,
  },
  swatches: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  swatch: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 3,
  },
});
