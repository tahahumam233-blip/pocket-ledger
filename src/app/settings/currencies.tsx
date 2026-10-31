import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Icon } from '@/components/icon';
import { ListRow } from '@/components/list-row';
import { CurrencyPickerSheet } from '@/components/picker-sheets';
import { Screen } from '@/components/screen';
import { useTheme } from '@/design';
import { getCurrency } from '@/domain';
import { useLedgerStore } from '@/state/ledger-store';
import { showToast } from '@/state/toast-store';
import { useQuery } from '@/state/use-query';

export default function CurrenciesScreen() {
  const theme = useTheme();
  const settings = useLedgerStore((state) => state.settings);
  const mutate = useLedgerStore((state) => state.mutate);
  const [editing, setEditing] = useState<string | null>(null);
  const history = useQuery(
    async (s) => {
      const entries = await Promise.all(
        settings.currencies.map(
          async (code) => [code, await s.repos.transactions.currencyHasHistory(code)] as const,
        ),
      );
      return new Map(entries);
    },
    [settings.currencies.join(',')],
  );

  const replace = async (previous: string, next: string) => {
    try {
      await mutate((s) => s.setup.replaceCurrency(previous, next));
      showToast(`${previous} replaced with ${next}.`, { tone: 'success' });
    } catch (caught) {
      showToast(caught instanceof Error ? caught.message : 'Could not change currency.', {
        tone: 'danger',
      });
    }
  };

  const swap = async () => {
    const secondary = settings.currencies[1];
    if (!secondary) return;
    await mutate((s) => s.setup.setPrimaryCurrency(secondary));
    showToast(`${secondary} is now your primary currency.`, { tone: 'success' });
  };

  return (
    <Screen header={{ title: 'Currencies', back: true }}>
      <AppText tone="muted">
        Your primary currency leads on the home screen. Every account can hold both currencies, and
        totals are never mixed.
      </AppText>
      <Card padded={false}>
        {settings.currencies.map((code, index) => {
          const locked = history.data?.get(code) ?? false;
          const info = getCurrency(code);
          return (
            <ListRow
              key={code}
              title={`${code} · ${info.name}`}
              subtitle={index === 0 ? 'Primary' : 'Secondary'}
              leading={
                <Icon
                  name={index === 0 ? 'star' : 'swap-horizontal'}
                  size={20}
                  color={index === 0 ? theme.colors.warning : theme.colors.textMuted}
                  outline
                />
              }
              trailing={
                locked ? (
                  <Icon name="lock-closed" size={18} color={theme.colors.textSubtle} outline />
                ) : undefined
              }
              onPress={
                locked
                  ? () => showToast(`${code} already has entries, so it cannot be replaced.`)
                  : () => setEditing(code)
              }
              chevron={!locked}
              last={index === settings.currencies.length - 1}
            />
          );
        })}
      </Card>
      <View style={styles.hint}>
        <Icon name="information-circle" size={18} color={theme.colors.textMuted} outline />
        <AppText variant="caption" tone="muted" style={styles.hintText}>
          A currency that already appears in your ledger is locked, because replacing it would
          orphan those entries.
        </AppText>
      </View>
      {settings.currencies.length > 1 ? (
        <Button
          label="Swap primary and secondary"
          icon="swap-vertical"
          variant="secondary"
          onPress={() => void swap()}
          fullWidth
        />
      ) : null}
      <CurrencyPickerSheet
        visible={editing !== null}
        onClose={() => setEditing(null)}
        value={editing}
        disabledCodes={settings.currencies}
        title={`Replace ${editing ?? ''}`}
        onSelect={(currency) => {
          if (editing) void replace(editing, currency.code);
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  hint: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
  },
  hintText: {
    flex: 1,
  },
});
