import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Platform, StyleSheet, Switch, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Card } from '@/components/card';
import { IconBadge } from '@/components/icon-badge';
import { ListRow } from '@/components/list-row';
import { Screen } from '@/components/screen';
import { SegmentedControl } from '@/components/segmented-control';
import type { ThemePreference } from '@/application/settings';
import { useTheme } from '@/design';
import { formatClockTime } from '@/domain';
import { authenticate, canUseAppLock } from '@/platform/app-lock';
import { haptics } from '@/platform/haptics';
import { removeAllReceiptFiles } from '@/platform/receipt-files';
import { shareTextFile } from '@/platform/share-file';
import { useLedgerStore, useServices } from '@/state/ledger-store';
import { showToast } from '@/state/toast-store';

const THEME_OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

export default function SettingsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const services = useServices();
  const settings = useLedgerStore((state) => state.settings);
  const snapshot = useLedgerStore((state) => state.snapshot);
  const mutate = useLedgerStore((state) => state.mutate);
  const [lockAvailable, setLockAvailable] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    void canUseAppLock().then(setLockAvailable);
  }, []);

  const update = (changes: Parameters<typeof services.setup.updateSettings>[0]) =>
    mutate((s) => s.setup.updateSettings(changes)).catch((caught) => {
      showToast(caught instanceof Error ? caught.message : 'Could not save.', { tone: 'danger' });
    });

  const toggleLock = async (next: boolean) => {
    if (next) {
      const ok = await authenticate('Confirm it is you to turn on the app lock');
      if (!ok) {
        showToast('Could not confirm your identity, so the lock stays off.', { tone: 'danger' });
        return;
      }
    }
    await update({ appLockEnabled: next });
  };

  const exportCsv = async () => {
    setExporting(true);
    try {
      const csv = await services.exporter.transactionsCsv();
      await shareTextFile(csv.fileName, csv.content, 'text/csv');
      showToast(`Exported ${csv.rows} ${csv.rows === 1 ? 'line' : 'lines'}.`, { tone: 'success' });
    } catch (caught) {
      showToast(caught instanceof Error ? caught.message : 'Export failed.', { tone: 'danger' });
    } finally {
      setExporting(false);
    }
  };

  const erase = () => {
    const perform = async () => {
      try {
        await mutate(async (s) => {
          await s.setup.eraseAllData();
          await removeAllReceiptFiles();
        });
        haptics.success();
        showToast('Everything was erased.');
      } catch (caught) {
        showToast(caught instanceof Error ? caught.message : 'Could not erase.', {
          tone: 'danger',
        });
      }
    };
    if (Platform.OS === 'web') {
      void perform();
      return;
    }
    Alert.alert(
      'Erase everything?',
      'All accounts, entries, categories and receipt photos on this phone will be deleted. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Erase',
          style: 'destructive',
          onPress: () =>
            Alert.alert('Are you sure?', 'Consider exporting a CSV first.', [
              { text: 'Keep my data', style: 'cancel' },
              { text: 'Erase everything', style: 'destructive', onPress: () => void perform() },
            ]),
        },
      ],
    );
  };

  const accountCount = snapshot?.accounts.length ?? 0;
  const categoryCount = snapshot?.categories.length ?? 0;
  const version = Constants.expoConfig?.version ?? '1.0.0';

  return (
    <Screen header={{ title: 'Settings', back: true, large: true }}>
      <View style={styles.group}>
        <AppText variant="micro" tone="muted" style={styles.groupTitle}>
          Preferences
        </AppText>
        <Card padded={false}>
          <ListRow
            title="Currencies"
            subtitle={`${settings.currencies[0]} primary · ${settings.currencies[1] ?? '—'} secondary`}
            leading={<IconBadge icon="cash" color={theme.colors.income} size={36} outline />}
            onPress={() => router.push('/settings/currencies')}
          />
          <ListRow
            title="Nightly reminder"
            subtitle={
              settings.reminderEnabled
                ? `Every day at ${formatClockTime(settings.reminderHour, settings.reminderMinute)}`
                : 'Off'
            }
            leading={
              <IconBadge icon="notifications" color={theme.colors.primary} size={36} outline />
            }
            onPress={() => router.push('/settings/reminder')}
          />
          <View style={[styles.inlineRow, { borderBottomColor: theme.colors.border }]}>
            <View style={styles.inlineHeader}>
              <IconBadge icon="contrast" color={theme.colors.transfer} size={36} outline />
              <AppText variant="bodyMedium">Appearance</AppText>
            </View>
            <SegmentedControl
              options={THEME_OPTIONS}
              value={settings.theme}
              onChange={(value) => void update({ theme: value })}
              size="sm"
            />
          </View>
          {lockAvailable ? (
            <ListRow
              title="App lock"
              subtitle="Require Face ID, fingerprint or passcode to open"
              leading={
                <IconBadge icon="finger-print" color={theme.colors.warning} size={36} outline />
              }
              trailing={
                <Switch
                  value={settings.appLockEnabled}
                  onValueChange={(value) => void toggleLock(value)}
                  trackColor={{ true: theme.colors.primary, false: theme.colors.borderStrong }}
                  thumbColor="#FFFFFF"
                />
              }
              chevron={false}
              last
            />
          ) : (
            <ListRow
              title="App lock"
              subtitle="Set up Face ID, fingerprint or a passcode on this phone to enable"
              leading={
                <IconBadge icon="finger-print" color={theme.colors.textSubtle} size={36} outline />
              }
              chevron={false}
              last
            />
          )}
        </Card>
      </View>

      <View style={styles.group}>
        <AppText variant="micro" tone="muted" style={styles.groupTitle}>
          Ledger
        </AppText>
        <Card padded={false}>
          <ListRow
            title="Accounts"
            subtitle={`${accountCount} active`}
            leading={<IconBadge icon="wallet" color={theme.colors.primary} size={36} outline />}
            onPress={() => router.push('/settings/accounts')}
          />
          <ListRow
            title="Categories"
            subtitle={`${categoryCount} active`}
            leading={<IconBadge icon="pricetags" color={theme.colors.expense} size={36} outline />}
            onPress={() => router.push('/settings/categories')}
            last
          />
        </Card>
      </View>

      <View style={styles.group}>
        <AppText variant="micro" tone="muted" style={styles.groupTitle}>
          Your data
        </AppText>
        <Card padded={false}>
          <ListRow
            title={exporting ? 'Preparing export…' : 'Export as CSV'}
            subtitle="Every entry, ready for a spreadsheet"
            leading={<IconBadge icon="download" color={theme.colors.income} size={36} outline />}
            onPress={() => void exportCsv()}
          />
          <ListRow
            title="Privacy & how data is stored"
            leading={
              <IconBadge icon="shield-checkmark" color={theme.colors.primary} size={36} outline />
            }
            onPress={() => router.push('/settings/about')}
          />
          <ListRow
            title="Erase all data"
            subtitle="Start again from scratch"
            leading={<IconBadge icon="trash" color={theme.colors.danger} size={36} outline />}
            onPress={erase}
            destructive
            chevron={false}
            last
          />
        </Card>
      </View>

      <AppText variant="caption" tone="subtle" align="center">
        Pocket Ledger {version} · offline, private, no account needed
      </AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  group: {
    gap: 8,
  },
  groupTitle: {
    paddingHorizontal: 4,
  },
  inlineRow: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  inlineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
});
