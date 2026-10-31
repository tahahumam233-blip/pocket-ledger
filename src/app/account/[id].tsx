import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { EmptyState } from '@/components/empty-state';
import { Icon } from '@/components/icon';
import { IconBadge } from '@/components/icon-badge';
import { MoneyText } from '@/components/money-text';
import { PressableScale } from '@/components/pressable-scale';
import { Screen } from '@/components/screen';
import { SectionHeader } from '@/components/section-header';
import { TransactionRow } from '@/components/transaction-row';
import { useTheme } from '@/design';
import { ACCOUNT_KIND_META } from '@/domain';
import { useLedgerStore } from '@/state/ledger-store';
import { useQuery } from '@/state/use-query';
import { buildLookup } from '@/utils/transaction-presenter';

export default function AccountDetailScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const snapshot = useLedgerStore((state) => state.snapshot);
  const entry = snapshot?.accountBalances.find((item) => item.account.id === id);
  const history = useQuery((s) => s.queries.transactions({ accountId: id, limit: 100 }), [id]);
  const currencies = snapshot?.settings.currencies ?? [];
  const lookup = buildLookup(snapshot?.accounts ?? [], snapshot?.categories ?? []);

  if (!entry) {
    return (
      <Screen header={{ title: 'Account', back: true }}>
        <EmptyState
          icon="alert-circle"
          title="Account not found"
          message="This account may have been archived."
          actionLabel="Manage accounts"
          onAction={() => router.push('/settings/accounts')}
        />
      </Screen>
    );
  }
  const { account, balances } = entry;
  const transactions = history.data ?? [];

  return (
    <Screen
      header={{
        title: account.name,
        back: true,
        right: (
          <PressableScale
            onPress={() =>
              router.push({ pathname: '/settings/account/[id]', params: { id: account.id } })
            }
            accessibilityRole="button"
            accessibilityLabel="Edit account"
            hitSlop={8}
          >
            <Icon name="create" size={22} color={theme.colors.primary} outline />
          </PressableScale>
        ),
      }}
    >
      <Card>
        <View style={styles.heroRow}>
          <IconBadge icon={account.icon} color={account.color} size={56} solid />
          <View style={styles.heroText}>
            <AppText variant="caption" tone="muted">
              {ACCOUNT_KIND_META[account.kind].label}
            </AppText>
            <AppText variant="heading">{account.name}</AppText>
          </View>
        </View>
        <View style={[styles.balances, { borderTopColor: theme.colors.border }]}>
          {currencies.map((code) => (
            <View key={code} style={styles.balance}>
              <AppText variant="micro" tone="muted">
                {code}
              </AppText>
              <MoneyText
                amountMinor={balances[code] ?? 0}
                currency={code}
                variant="amountMedium"
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.6}
              />
              <PressableScale
                onPress={() =>
                  router.push({
                    pathname: '/account/adjust',
                    params: { accountId: account.id, currency: code },
                  })
                }
                accessibilityRole="button"
                hitSlop={6}
              >
                <AppText variant="captionStrong" tone="primary">
                  Adjust
                </AppText>
              </PressableScale>
            </View>
          ))}
        </View>
      </Card>

      <View style={styles.actions}>
        <Button
          label="Expense"
          icon="remove-circle"
          variant="secondary"
          onPress={() =>
            router.push({
              pathname: '/transaction/new',
              params: { kind: 'expense', accountId: account.id },
            })
          }
          style={styles.action}
        />
        <Button
          label="Income"
          icon="add-circle"
          variant="secondary"
          onPress={() =>
            router.push({
              pathname: '/transaction/new',
              params: { kind: 'income', accountId: account.id },
            })
          }
          style={styles.action}
        />
        <Button
          label="Transfer"
          icon="swap-horizontal"
          variant="secondary"
          onPress={() =>
            router.push({
              pathname: '/transaction/new',
              params: { kind: 'transfer', accountId: account.id },
            })
          }
          style={styles.action}
        />
      </View>

      <View style={styles.section}>
        <SectionHeader
          title="History"
          caption={`${transactions.length} most recent`}
          actionLabel="Filter"
          onAction={() => router.push({ pathname: '/activity', params: { accountId: account.id } })}
        />
        {transactions.length === 0 ? (
          <Card>
            <EmptyState
              compact
              icon="time"
              title="No entries yet"
              message="Entries that touch this account will appear here."
            />
          </Card>
        ) : (
          <Card padded={false}>
            {transactions.map((transaction, index) => (
              <TransactionRow
                key={transaction.id}
                transaction={transaction}
                lookup={lookup}
                last={index === transactions.length - 1}
                onPress={() =>
                  router.push({ pathname: '/transaction/[id]', params: { id: transaction.id } })
                }
              />
            ))}
          </Card>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  heroText: {
    flex: 1,
    gap: 2,
  },
  balances: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  balance: {
    flex: 1,
    gap: 4,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  action: {
    flex: 1,
    paddingHorizontal: 8,
  },
  section: {
    gap: 12,
  },
});
