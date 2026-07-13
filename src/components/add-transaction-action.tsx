import { router } from 'expo-router';

import { PrimaryButton } from '@/components/primary-button';

export function AddTransactionAction() {
  return (
    <PrimaryButton
      label="Add transaction"
      accessibilityHint="Opens the Phase 0 transaction entry placeholder"
      onPress={() => router.push('/add-transaction')}
    />
  );
}
