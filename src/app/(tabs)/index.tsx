import { AddTransactionAction } from '@/components/add-transaction-action';
import { FeaturePlaceholder } from '@/components/feature-placeholder';
import { ScreenContainer } from '@/components/screen-container';

export default function DashboardScreen() {
  return (
    <ScreenContainer
      title="Dashboard"
      subtitle="A private, offline-first home for your personal accounts."
    >
      <FeaturePlaceholder
        icon="wallet-outline"
        title="No wallets yet"
        message="Wallet balances will be derived from a real ledger after onboarding and persistence are implemented."
        availability="Wallet setup arrives in Phase 3"
      />
      <AddTransactionAction />
    </ScreenContainer>
  );
}
