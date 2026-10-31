import { useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, Platform, ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { EmptyState } from '@/components/empty-state';
import { IconBadge } from '@/components/icon-badge';
import { ListRow } from '@/components/list-row';
import { MoneyText } from '@/components/money-text';
import { ReceiptThumbnail } from '@/components/receipt-thumbnail';
import { Screen } from '@/components/screen';
import { useTheme } from '@/design';
import { formatLongDate } from '@/domain';
import { haptics } from '@/platform/haptics';
import { useLedgerStore, useServices } from '@/state/ledger-store';
import { showToast } from '@/state/toast-store';
import { useQuery } from '@/state/use-query';
import { buildLookup, presentTransaction } from '@/utils/transaction-presenter';

export default function TransactionDetailScreen() {
  const theme = useTheme();
  const router = useRouter();
  const services = useServices();
  const { id } = useLocalSearchParams<{ id: string }>();
  const snapshot = useLedgerStore((state) => state.snapshot);
  const mutate = useLedgerStore((state) => state.mutate);
  const query = useQuery(
    async (s) => {
      const transaction = await s.ledger.getTransaction(id);
      const receipts = transaction ? await s.receipts.forTransaction(transaction.id) : [];
      return { transaction, receipts };
    },
    [id],
  );

  const transaction = query.data?.transaction;
  if (!query.data) return <Screen header={{ title: 'Entry', back: true }} />;
  if (!transaction) {
    return (
      <Screen header={{ title: 'Entry', back: true }}>
        <EmptyState
          icon="alert-circle"
          title="Entry not found"
          message="This entry may have been removed."
        />
      </Screen>
    );
  }

  const lookup = buildLookup(snapshot?.accounts ?? [], snapshot?.categories ?? []);
  const view = presentTransaction(transaction, lookup, theme.colors);
  const mainAmount = view.amounts[view.amounts.length - 1];
  const receipts = query.data.receipts;
  const source = transaction.lines.find((line) => line.role === 'source');
  const destination = transaction.lines.find((line) => line.role === 'destination');
  const single = transaction.lines[0];

  const remove = () => {
    const perform = async () => {
      try {
        await mutate((s) => s.ledger.deleteTransaction(transaction.id));
        haptics.success();
        showToast('Entry deleted.', {
          action: {
            label: 'Undo',
            onPress: async () => {
              try {
                await mutate((s) => s.ledger.restoreTransaction(transaction.id));
                showToast('Entry restored.', { tone: 'success' });
              } catch (caught) {
                showToast(caught instanceof Error ? caught.message : 'Could not restore.', {
                  tone: 'danger',
                });
              }
            },
          },
        });
        if (router.canGoBack()) router.back();
        else router.replace('/');
      } catch (caught) {
        showToast(caught instanceof Error ? caught.message : 'Could not delete.', {
          tone: 'danger',
        });
      }
    };
    if (Platform.OS === 'web') {
      void perform();
      return;
    }
    Alert.alert(
      'Delete this entry?',
      'Balances and reports update immediately. You can undo for a few seconds.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => void perform() },
      ],
    );
  };

  return (
    <Screen header={{ title: view.kindLabel, back: true }} edges={['top', 'bottom']}>
      <View style={styles.hero}>
        <IconBadge icon={view.icon} color={view.color} size={72} outline />
        <AppText variant="heading" align="center">
          {view.title}
        </AppText>
        {mainAmount ? (
          <MoneyText
            amountMinor={mainAmount.amountMinor}
            currency={mainAmount.currency}
            variant="amountHero"
            signed={transaction.kind !== 'transfer'}
            format={transaction.kind === 'transfer' ? { sign: 'never' } : undefined}
          />
        ) : null}
        {transaction.deletedAt ? (
          <AppText variant="label" tone="danger">
            This entry is deleted and no longer counts.
          </AppText>
        ) : null}
      </View>

      <Card padded={false}>
        {transaction.kind === 'transfer' && source && destination ? (
          <>
            <ListRow
              title="From"
              trailing={
                <AppText variant="bodyMedium">
                  {lookup.accounts.get(source.accountId)?.name ?? 'Account'}
                </AppText>
              }
              chevron={false}
            />
            <ListRow
              title="To"
              trailing={
                <View style={styles.trailing}>
                  <AppText variant="bodyMedium">
                    {lookup.accounts.get(destination.accountId)?.name ?? 'Account'}
                  </AppText>
                  {source.currency !== destination.currency ? (
                    <MoneyText
                      amountMinor={destination.amountMinor}
                      currency={destination.currency}
                      variant="amountSmall"
                      tone="muted"
                    />
                  ) : null}
                </View>
              }
              chevron={false}
            />
          </>
        ) : single ? (
          <ListRow
            title="Account"
            trailing={
              <AppText variant="bodyMedium">
                {lookup.accounts.get(single.accountId)?.name ?? 'Account'}
              </AppText>
            }
            chevron={false}
          />
        ) : null}
        {transaction.categoryId ? (
          <ListRow
            title="Category"
            trailing={
              <AppText variant="bodyMedium">
                {lookup.categories.get(transaction.categoryId)?.name ?? 'Category'}
              </AppText>
            }
            chevron={false}
          />
        ) : null}
        <ListRow
          title="Date"
          trailing={
            <AppText variant="bodyMedium">{formatLongDate(transaction.postedDate)}</AppText>
          }
          chevron={false}
        />
        <ListRow title="Note" subtitle={transaction.note || 'No note'} chevron={false} last />
      </Card>

      {receipts.length > 0 ? (
        <View style={styles.receipts}>
          <AppText variant="labelStrong">Receipts</AppText>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.receiptRow}
          >
            {receipts.map((receipt) => (
              <ReceiptThumbnail
                key={receipt.id}
                uri={services.receipts.uriFor(receipt)}
                size={96}
                onPress={() =>
                  router.push({ pathname: '/receipt/[id]', params: { id: receipt.id } })
                }
              />
            ))}
          </ScrollView>
        </View>
      ) : null}

      <View style={styles.actions}>
        <Button
          label="Edit"
          icon="create"
          variant="secondary"
          onPress={() =>
            router.push({ pathname: '/transaction/edit/[id]', params: { id: transaction.id } })
          }
          fullWidth
        />
        <Button label="Delete" icon="trash" variant="danger" onPress={remove} fullWidth />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  trailing: {
    alignItems: 'flex-end',
  },
  receipts: {
    gap: 8,
  },
  receiptRow: {
    gap: 10,
  },
  actions: {
    gap: 10,
    marginTop: 8,
  },
});
