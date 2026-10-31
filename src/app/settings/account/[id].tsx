import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Platform, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { EmptyState } from '@/components/empty-state';
import { Field, TextField } from '@/components/form-row';
import { IconBadge } from '@/components/icon-badge';
import { PressableScale } from '@/components/pressable-scale';
import { Screen } from '@/components/screen';
import { SegmentedControl } from '@/components/segmented-control';
import { useTheme, withAlpha } from '@/design';
import {
  ACCOUNT_KIND_META,
  type Account,
  type AccountKind,
  COLOR_CHOICES,
  DEFAULT_ACCOUNT_TEMPLATES,
  ICON_CHOICES,
} from '@/domain';
import { useLedgerStore } from '@/state/ledger-store';
import { showToast } from '@/state/toast-store';
import { useQuery } from '@/state/use-query';

const KIND_OPTIONS = (Object.keys(ACCOUNT_KIND_META) as AccountKind[]).map((kind) => ({
  value: kind,
  label: ACCOUNT_KIND_META[kind].label,
}));

export default function AccountFormScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === 'new';
  const existing = useQuery(
    (s) => (isNew ? Promise.resolve(null) : s.repos.accounts.getById(id)),
    [id],
  );
  if (isNew) return <AccountForm key="new" account={null} />;
  if (!existing.data && existing.loading)
    return <Screen header={{ title: 'Edit account', back: true }} />;
  if (!existing.data) {
    return (
      <Screen header={{ title: 'Edit account', back: true }}>
        <EmptyState
          icon="alert-circle"
          title="Account not found"
          message="This account may have been removed."
        />
      </Screen>
    );
  }
  return <AccountForm key={existing.data.id} account={existing.data} />;
}

function AccountForm({ account }: { account: Account | null }) {
  const theme = useTheme();
  const router = useRouter();
  const mutate = useLedgerStore((state) => state.mutate);
  const isNew = account === null;
  const [name, setName] = useState(account?.name ?? '');
  const [kind, setKind] = useState<AccountKind>(account?.kind ?? 'bank');
  const [icon, setIcon] = useState(account?.icon ?? 'business');
  const [color, setColor] = useState(account?.color ?? COLOR_CHOICES[8] ?? '#1F4FD8');
  const [saving, setSaving] = useState(false);

  const chooseKind = (next: AccountKind) => {
    setKind(next);
    if (isNew) {
      const template = DEFAULT_ACCOUNT_TEMPLATES.find((item) => item.kind === next);
      if (template) {
        setIcon(template.icon);
        setColor(template.color);
        if (!name.trim()) setName(template.name);
      }
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      await mutate(async (s) => {
        if (account) await s.setup.updateAccount(account.id, { name, kind, icon, color });
        else await s.setup.createAccount({ name, kind, icon, color });
      });
      showToast(isNew ? 'Account added.' : 'Account updated.', { tone: 'success' });
      router.back();
    } catch (caught) {
      showToast(caught instanceof Error ? caught.message : 'Could not save.', { tone: 'danger' });
    } finally {
      setSaving(false);
    }
  };

  const remove = () => {
    if (!account) return;
    const perform = async () => {
      try {
        const result = await mutate((s) => s.setup.removeAccount(account.id));
        showToast(
          result === 'archived' ? 'Account archived. Its history is kept.' : 'Account removed.',
        );
        router.back();
      } catch (caught) {
        showToast(caught instanceof Error ? caught.message : 'Could not remove.', {
          tone: 'danger',
        });
      }
    };
    if (Platform.OS === 'web') {
      void perform();
      return;
    }
    Alert.alert(
      'Remove this account?',
      'If it has entries it is archived instead of deleted, so your history and reports stay correct.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => void perform() },
      ],
    );
  };

  return (
    <Screen header={{ title: isNew ? 'New account' : 'Edit account', back: true }} keyboard>
      <View style={styles.preview}>
        <IconBadge icon={icon} color={color} size={72} solid />
        <AppText variant="heading">{name.trim() || 'Account name'}</AppText>
      </View>
      <Field label="Name">
        <TextField
          value={name}
          onChangeText={setName}
          placeholder="e.g. Savings, Second bank"
          autoCapitalize="words"
          returnKeyType="done"
        />
      </Field>
      <Field label="Type">
        <SegmentedControl options={KIND_OPTIONS} value={kind} onChange={chooseKind} size="sm" />
      </Field>
      <Field label="Color">
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
      <Field label="Icon">
        <View style={styles.icons}>
          {ICON_CHOICES.map((choice) => (
            <PressableScale
              key={choice}
              onPress={() => setIcon(choice)}
              accessibilityRole="radio"
              accessibilityState={{ selected: choice === icon }}
              style={[
                styles.iconTile,
                {
                  backgroundColor: choice === icon ? withAlpha(color, 0.18) : theme.colors.surface,
                  borderColor: choice === icon ? color : theme.colors.border,
                  borderRadius: theme.radii.md,
                },
              ]}
            >
              <IconBadge
                icon={choice}
                color={choice === icon ? color : theme.colors.textMuted}
                size={32}
                outline
              />
            </PressableScale>
          ))}
        </View>
      </Field>
      <Button
        label={isNew ? 'Add account' : 'Save changes'}
        onPress={() => void save()}
        loading={saving}
        disabled={!name.trim()}
        size="lg"
        fullWidth
      />
      {!isNew ? (
        <Button label="Remove account" icon="trash" variant="danger" onPress={remove} fullWidth />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  preview: {
    alignItems: 'center',
    gap: 10,
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
  icons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  iconTile: {
    padding: 6,
    borderWidth: 1,
  },
});
