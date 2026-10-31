import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { IconBadge } from '@/components/icon-badge';
import { ListRow } from '@/components/list-row';
import { MoneyText } from '@/components/money-text';
import { Screen } from '@/components/screen';
import { ACCOUNT_KIND_META } from '@/domain';
import { useLedgerStore } from '@/state/ledger-store';
import { showToast } from '@/state/toast-store';
import { useQuery } from '@/state/use-query';

export default function AccountsSettingsScreen() {
  const router = useRouter();
  const snapshot = useLedgerStore((state) => state.snapshot);
  const mutate = useLedgerStore((state) => state.mutate);
  const archived = useQuery(
    async (s) =>
      (await s.repos.accounts.list({ includeArchived: true })).filter(
        (account) => account.archivedAt,
      ),
    [],
  );
  const currencies = snapshot?.settings.currencies ?? [];
  const entries = snapshot?.accountBalances ?? [];
  const archivedAccounts = archived.data ?? [];

  return (
    <Screen header={{ title: 'Accounts', back: true }}>
      <AppText tone="muted">
        Accounts are the places your money sits. Each one holds both currencies.
      </AppText>
      <Card padded={false}>
        {entries.map(({ account, balances }, index) => (
          <ListRow
            key={account.id}
            title={account.name}
            subtitle={ACCOUNT_KIND_META[account.kind].label}
            leading={<IconBadge icon={account.icon} color={account.color} size={40} solid />}
            trailing={
              <View style={styles.balances}>
                {currencies.map((code) => (
                  <MoneyText
                    key={code}
                    amountMinor={balances[code] ?? 0}
                    currency={code}
                    variant="amountSmall"
                    tone="muted"
                  />
                ))}
              </View>
            }
            onPress={() =>
              router.push({ pathname: '/settings/account/[id]', params: { id: account.id } })
            }
            last={index === entries.length - 1}
          />
        ))}
      </Card>
      <Button
        label="Add an account"
        icon="add"
        variant="soft"
        onPress={() => router.push({ pathname: '/settings/account/[id]', params: { id: 'new' } })}
        fullWidth
      />
      {archivedAccounts.length > 0 ? (
        <View style={styles.archived}>
          <AppText variant="labelStrong" tone="muted">
            Archived
          </AppText>
          <Card padded={false}>
            {archivedAccounts.map((account, index) => (
              <ListRow
                key={account.id}
                title={account.name}
                subtitle="Hidden from new entries; history kept"
                leading={<IconBadge icon={account.icon} color={account.color} size={40} />}
                trailing={
                  <Button
                    label="Restore"
                    size="sm"
                    variant="ghost"
                    onPress={() =>
                      void mutate((s) => s.setup.restoreAccount(account.id)).then(() => {
                        void archived.reload();
                        showToast(`${account.name} restored.`, { tone: 'success' });
                      })
                    }
                  />
                }
                chevron={false}
                last={index === archivedAccounts.length - 1}
              />
            ))}
          </Card>
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  balances: {
    alignItems: 'flex-end',
  },
  archived: {
    gap: 8,
  },
});
