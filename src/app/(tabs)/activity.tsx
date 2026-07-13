import { AddTransactionAction } from '@/components/add-transaction-action';
import { FeaturePlaceholder } from '@/components/feature-placeholder';
import { ScreenContainer } from '@/components/screen-container';

export default function ActivityScreen() {
  return (
    <ScreenContainer
      title="Activity"
      subtitle="Searchable transaction history will live here once the ledger is available."
    >
      <FeaturePlaceholder
        icon="receipt-outline"
        title="No activity yet"
        message="This foundation does not create sample transactions or pretend that data is persisted."
        availability="Real transaction entry arrives in Phase 4"
      />
      <AddTransactionAction />
    </ScreenContainer>
  );
}
