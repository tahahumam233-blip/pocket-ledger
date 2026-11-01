import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Chip } from '@/components/chip';
import { EmptyState } from '@/components/empty-state';
import { TextField } from '@/components/form-row';
import { Screen } from '@/components/screen';
import { TransactionRow } from '@/components/transaction-row';
import { askConfirm } from '@/platform/confirm';
import { useTheme } from '@/design';
import { formatLongDate, toIsoDate } from '@/domain';
import { useLedgerStore, useServices } from '@/state/ledger-store';
import { showToast } from '@/state/toast-store';
import { useQuery } from '@/state/use-query';
import { useReceiptUri } from '@/state/use-receipt-uri';
import { buildLookup } from '@/utils/transaction-presenter';

export default function ReceiptDetailScreen() {
  const theme = useTheme();
  const router = useRouter();
  const services = useServices();
  const { id } = useLocalSearchParams<{ id: string }>();
  const snapshot = useLedgerStore((state) => state.snapshot);
  const mutate = useLedgerStore((state) => state.mutate);
  const { width } = useWindowDimensions();
  const query = useQuery(
    async (s) => {
      const receipt = await s.receipts.get(id);
      const transaction = receipt?.transactionId
        ? await s.ledger.getTransaction(receipt.transactionId)
        : null;
      return { receipt, transaction };
    },
    [id],
  );
  const receipt = query.data?.receipt;
  const imageUri = useReceiptUri(receipt?.fileName);
  if (!query.data) return <Screen header={{ title: 'Receipt', back: true }} />;
  if (!receipt) {
    return (
      <Screen header={{ title: 'Receipt', back: true }}>
        <EmptyState
          icon="alert-circle"
          title="Receipt not found"
          message="This receipt may have been deleted."
        />
      </Screen>
    );
  }

  const imageWidth = Math.min(width, theme.layout.maxContentWidth) - 40;
  const ratio = receipt.width && receipt.height ? receipt.height / receipt.width : 1.3;
  const imageHeight = Math.min(imageWidth * ratio, 560);
  const linked =
    query.data.transaction && !query.data.transaction.deletedAt ? query.data.transaction : null;
  const lookup = buildLookup(snapshot?.allAccounts ?? [], snapshot?.categories ?? []);

  const detach = async () => {
    await mutate((s) => s.receipts.detach(receipt.id));
    showToast('Receipt moved back to the inbox.');
  };

  const remove = () => {
    const perform = async () => {
      await mutate((s) => s.receipts.remove(receipt.id));
      showToast('Receipt deleted.');
      if (router.canGoBack()) router.back();
      else router.replace('/receipts');
    };
    void askConfirm({
      title: 'Delete this receipt?',
      message: 'The photo is removed from this phone. Any linked entry stays in your ledger.',
      confirmLabel: 'Delete',
      destructive: true,
    }).then((confirmed) => {
      if (confirmed) void perform();
    });
  };

  return (
    <Screen header={{ title: 'Receipt', back: true }} edges={['top', 'bottom']} keyboard>
      <View style={styles.meta}>
        <Chip
          label={linked ? 'Recorded' : 'Needs an amount'}
          selected
          color={linked ? theme.colors.income : theme.colors.warning}
          icon={linked ? 'checkmark-circle' : 'time'}
        />
        <AppText variant="caption" tone="muted">
          Saved {formatLongDate(toIsoDate(new Date(receipt.capturedAt)))}
        </AppText>
      </View>

      <View
        style={[
          styles.imageFrame,
          {
            borderRadius: theme.radii.xl,
            backgroundColor: theme.colors.surfaceMuted,
            borderColor: theme.colors.border,
            height: imageHeight,
          },
        ]}
      >
        <Image
          source={imageUri ? { uri: imageUri } : undefined}
          style={styles.image}
          contentFit="contain"
          transition={200}
        />
      </View>

      {!linked ? (
        <Button
          label="Add the amount"
          icon="calculator"
          size="lg"
          onPress={() =>
            router.push({
              pathname: '/transaction/new',
              params: { kind: 'expense', receiptId: receipt.id },
            })
          }
          fullWidth
        />
      ) : (
        <View style={styles.linked}>
          <AppText variant="labelStrong">Recorded as</AppText>
          <Card padded={false}>
            <TransactionRow
              transaction={linked}
              lookup={lookup}
              last
              onPress={() =>
                router.push({ pathname: '/transaction/[id]', params: { id: linked.id } })
              }
            />
          </Card>
          <Button
            label="Move back to inbox"
            variant="ghost"
            size="sm"
            onPress={() => void detach()}
          />
        </View>
      )}

      <ReceiptNote
        key={receipt.id}
        initial={receipt.note}
        onSave={async (next) => {
          await services.receipts.updateNote(receipt.id, next);
          showToast('Note saved.', { tone: 'success' });
        }}
      />

      <Button label="Delete receipt" icon="trash" variant="danger" onPress={remove} fullWidth />
    </Screen>
  );
}

function ReceiptNote({
  initial,
  onSave,
}: {
  initial: string;
  onSave: (note: string) => Promise<void>;
}) {
  const [note, setNote] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const commit = () => {
    if (note.trim() === saved) return;
    setSaved(note.trim());
    void onSave(note);
  };
  return (
    <View style={styles.noteBlock}>
      <AppText variant="labelStrong">Note</AppText>
      <TextField
        value={note}
        onChangeText={setNote}
        placeholder="Shop name, what it was for…"
        onBlur={commit}
        returnKeyType="done"
        onSubmitEditing={commit}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  imageFrame: {
    width: '100%',
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  linked: {
    gap: 8,
  },
  noteBlock: {
    gap: 8,
  },
});
