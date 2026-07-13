import { AddTransactionAction } from '@/components/add-transaction-action';
import { FeaturePlaceholder } from '@/components/feature-placeholder';
import { ScreenContainer } from '@/components/screen-container';

export default function ReportsScreen() {
  return (
    <ScreenContainer
      title="Reports"
      subtitle="Clear monthly summaries without combining unrelated currencies."
    >
      <FeaturePlaceholder
        icon="analytics-outline"
        title="Reports need ledger data"
        message="Income, expenses, transfers, and adjustments will be classified by tested accounting rules."
        availability="Reports arrive in Phase 7"
      />
      <AddTransactionAction />
    </ScreenContainer>
  );
}
