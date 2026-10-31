import { useLocalSearchParams } from 'expo-router';

import { EmptyState } from '@/components/empty-state';
import { Screen } from '@/components/screen';
import { TransactionForm } from '@/features/transactions/transaction-form';
import { useQuery } from '@/state/use-query';

export default function EditTransactionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const query = useQuery(
    async (services) => {
      const transaction = await services.ledger.getTransaction(id);
      const receipts = transaction ? await services.receipts.forTransaction(transaction.id) : [];
      return { transaction, receipts };
    },
    [id],
  );
  if (!query.data) return <Screen header={{ title: 'Edit', close: true }} />;
  if (!query.data.transaction) {
    return (
      <Screen header={{ title: 'Edit', close: true }}>
        <EmptyState
          icon="alert-circle"
          title="Entry not found"
          message="This entry may have been removed."
        />
      </Screen>
    );
  }
  return (
    <TransactionForm
      mode="edit"
      transaction={query.data.transaction}
      existingReceipts={query.data.receipts}
    />
  );
}
