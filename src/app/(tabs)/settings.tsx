import { AddTransactionAction } from '@/components/add-transaction-action';
import { FeaturePlaceholder } from '@/components/feature-placeholder';
import { ScreenContainer } from '@/components/screen-container';

export default function SettingsScreen() {
  return (
    <ScreenContainer
      title="Settings"
      subtitle="Control wallets, categories, reminders, backups, and privacy as each phase lands."
    >
      <FeaturePlaceholder
        icon="options-outline"
        title="Settings are planned, not simulated"
        message="Wallets and categories start in Phase 3; reminders, backup, and app lock follow in later phases."
        availability="The app currently follows your system light or dark theme"
      />
      <AddTransactionAction />
    </ScreenContainer>
  );
}
