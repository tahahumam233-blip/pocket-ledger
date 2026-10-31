import { useLocalSearchParams } from 'expo-router';

import { TransactionForm } from '@/features/transactions/transaction-form';

export default function NewTransactionScreen() {
  const params = useLocalSearchParams<{ kind?: string; accountId?: string; receiptId?: string }>();
  const kind = params.kind === 'income' || params.kind === 'transfer' ? params.kind : 'expense';
  return (
    <TransactionForm
      key={`${kind}-${params.receiptId ?? ''}`}
      mode="create"
      initialKind={kind}
      initialAccountId={params.accountId}
      receiptId={params.receiptId}
    />
  );
}
