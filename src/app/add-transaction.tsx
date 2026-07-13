import { router } from 'expo-router';

import { FeaturePlaceholder } from '@/components/feature-placeholder';
import { PrimaryButton } from '@/components/primary-button';
import { ScreenContainer } from '@/components/screen-container';

export default function AddTransactionScreen() {
  const close = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace('/');
  };

  return (
    <ScreenContainer
      title="Add transaction"
      subtitle="This route proves the entry point and modal navigation without faking accounting behavior."
    >
      <FeaturePlaceholder
        icon="add-circle-outline"
        title="Entry types are not enabled yet"
        message="Expense, income, transfer, and adjustment entry require the tested domain and SQLite phases."
        availability="Transaction entry arrives in Phase 4"
      />
      <PrimaryButton label="Close" onPress={close} />
    </ScreenContainer>
  );
}
