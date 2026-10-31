import { useRouter } from 'expo-router';

import { EmptyState } from '@/components/empty-state';
import { Screen } from '@/components/screen';

export default function NotFoundScreen() {
  const router = useRouter();
  return (
    <Screen header={{ title: 'Not found', back: true }}>
      <EmptyState
        icon="compass"
        title="This page does not exist"
        message="The link you followed points somewhere the app does not know about."
        actionLabel="Go home"
        onAction={() => router.replace('/')}
      />
    </Screen>
  );
}
