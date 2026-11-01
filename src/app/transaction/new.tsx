import { useLocalSearchParams } from 'expo-router';

import { DEBT_ACTIONS, type DebtAction } from '@/domain';
import { TransactionForm } from '@/features/transactions/transaction-form';

const KINDS = ['expense', 'income', 'transfer', 'debt'] as const;

export default function NewTransactionScreen() {
  const params = useLocalSearchParams<{
    kind?: string;
    accountId?: string;
    receiptId?: string;
    personId?: string;
    action?: string;
    amount?: string;
    currency?: string;
  }>();
  const kind = KINDS.find((value) => value === params.kind) ?? 'expense';
  const action = DEBT_ACTIONS.find((value) => value === params.action) as DebtAction | undefined;
  return (
    <TransactionForm
      key={`${kind}-${params.receiptId ?? ''}-${params.personId ?? ''}-${action ?? ''}`}
      mode="create"
      initialKind={kind}
      initialAccountId={params.accountId}
      initialPersonId={params.personId}
      initialDebtAction={action}
      initialAmount={params.amount}
      initialCurrency={params.currency}
      receiptId={params.receiptId}
    />
  );
}
