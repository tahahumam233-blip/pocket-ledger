import { router } from 'expo-router';

import { FeaturePlaceholder } from '@/components/feature-placeholder';
import { PrimaryButton } from '@/components/primary-button';
import { ScreenContainer } from '@/components/screen-container';
import { APP_BRAND } from '@/config/branding';

export default function NotFoundScreen() {
  return (
    <ScreenContainer
      title="Page not found"
      subtitle={`That destination is not part of ${APP_BRAND.name}.`}
    >
      <FeaturePlaceholder
        icon="compass-outline"
        title="Nothing is stored at this address"
        message="Return to the dashboard to continue."
        availability="No data was changed"
      />
      <PrimaryButton label="Go to dashboard" onPress={() => router.replace('/')} />
    </ScreenContainer>
  );
}
