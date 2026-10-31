import { useRouter } from 'expo-router';
import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Card } from '@/components/card';
import { EmptyState } from '@/components/empty-state';
import { IconBadge } from '@/components/icon-badge';
import { PressableScale } from '@/components/pressable-scale';
import { ReceiptThumbnail } from '@/components/receipt-thumbnail';
import { Screen } from '@/components/screen';
import { SectionHeader } from '@/components/section-header';
import { useTheme } from '@/design';
import { formatDateLabel, toIsoDate } from '@/domain';
import { useQuickCapture } from '@/features/receipts/use-quick-capture';
import { useLedgerStore } from '@/state/ledger-store';
import { useQuery } from '@/state/use-query';

export default function ReceiptsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const today = useLedgerStore((state) => state.snapshot?.today);
  const capture = useQuickCapture();
  const inbox = useQuery((s) => s.queries.receiptsInbox(), []);
  const { width } = useWindowDimensions();
  const columns = 3;
  const gridWidth = Math.min(width, theme.layout.maxContentWidth) - 40;
  const tile = Math.floor((gridWidth - (columns - 1) * 12) / columns);

  const pending = inbox.data?.pending ?? [];
  const done = inbox.data?.done ?? [];
  const captionFor = (capturedAt: string) =>
    formatDateLabel(toIsoDate(new Date(capturedAt)), today);

  const actions = [
    {
      label: 'Snap a receipt',
      hint: 'Use the camera',
      icon: 'camera',
      onPress: () => void capture.snap(),
    },
    {
      label: 'From photos',
      hint: 'Pick an existing picture',
      icon: 'images',
      onPress: () => void capture.pick(),
    },
  ];

  return (
    <Screen
      header={{
        title: 'Receipts',
        large: true,
        subtitle: 'Save the picture now, add the amount later.',
      }}
      bottomInset={theme.layout.tabBarHeight}
      refreshing={inbox.loading && Boolean(inbox.data)}
      onRefresh={() => void inbox.reload()}
    >
      <View style={styles.actions}>
        {actions.map((action) => (
          <Card
            key={action.label}
            onPress={action.onPress}
            style={styles.actionCard}
            accessibilityLabel={action.label}
          >
            <IconBadge icon={action.icon} color={theme.colors.primary} size={44} outline />
            <View style={styles.actionText}>
              <AppText variant="bodyStrong">{action.label}</AppText>
              <AppText variant="caption" tone="muted">
                {action.hint}
              </AppText>
            </View>
          </Card>
        ))}
      </View>

      {pending.length === 0 && done.length === 0 && inbox.data ? (
        <EmptyState
          icon="receipt"
          title="No receipts yet"
          message="Snap invoices and receipts as you get them. They wait here until you add the amount."
        />
      ) : null}

      {pending.length > 0 ? (
        <View style={styles.section}>
          <SectionHeader title="Needs an amount" caption={`${pending.length} waiting`} />
          <View style={styles.grid}>
            {pending.map((receipt) => (
              <ReceiptThumbnail
                key={receipt.id}
                fileName={receipt.fileName}
                size={tile}
                badge="Add amount"
                caption={captionFor(receipt.capturedAt)}
                onPress={() =>
                  router.push({ pathname: '/receipt/[id]', params: { id: receipt.id } })
                }
              />
            ))}
          </View>
        </View>
      ) : null}

      {done.length > 0 ? (
        <View style={styles.section}>
          <SectionHeader title="Recorded" caption="Linked to a transaction" />
          <View style={styles.grid}>
            {done.map((receipt) => (
              <ReceiptThumbnail
                key={receipt.id}
                fileName={receipt.fileName}
                size={tile}
                badge="Done"
                badgeTone="success"
                caption={captionFor(receipt.capturedAt)}
                onPress={() =>
                  router.push({ pathname: '/receipt/[id]', params: { id: receipt.id } })
                }
              />
            ))}
          </View>
        </View>
      ) : null}

      <PressableScale
        onPress={() => router.push('/settings/about')}
        accessibilityRole="link"
        style={styles.privacy}
      >
        <AppText variant="caption" tone="subtle" align="center">
          Photos stay on this phone and are never uploaded.
        </AppText>
      </PressableScale>
    </Screen>
  );
}

const styles = StyleSheet.create({
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionCard: {
    flex: 1,
    gap: 12,
  },
  actionText: {
    gap: 2,
  },
  section: {
    gap: 12,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  privacy: {
    paddingVertical: 8,
  },
});
