import { Linking, Platform, StyleSheet, Switch, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { IconBadge } from '@/components/icon-badge';
import { Screen } from '@/components/screen';
import { TimeField } from '@/components/time-field';
import { planReminder } from '@/application/reminder';
import { useTheme } from '@/design';
import { expoReminderScheduler, getNotificationPermissionStatus } from '@/platform/notifications';
import { useLedgerStore } from '@/state/ledger-store';
import { showToast } from '@/state/toast-store';
import { useQuery } from '@/state/use-query';

export default function ReminderSettingsScreen() {
  const theme = useTheme();
  const settings = useLedgerStore((state) => state.settings);
  const pending = useLedgerStore((state) => state.snapshot?.pendingReceipts ?? 0);
  const mutate = useLedgerStore((state) => state.mutate);
  const permission = useQuery(() => getNotificationPermissionStatus(), [settings.reminderEnabled]);

  const toggle = async (next: boolean) => {
    if (next) {
      const allowed = await expoReminderScheduler.ensurePermission();
      if (!allowed) {
        showToast(
          Platform.OS === 'web'
            ? 'Reminders need the phone app.'
            : 'Notifications are turned off for Pocket Ledger in your phone settings.',
          { tone: 'danger' },
        );
        await permission.reload();
        return;
      }
    }
    await mutate((s) => s.setup.updateSettings({ reminderEnabled: next }));
  };

  const preview = planReminder({ ...settings, reminderEnabled: true }, pending);

  return (
    <Screen header={{ title: 'Nightly reminder', back: true }}>
      <Card>
        <View style={styles.row}>
          <IconBadge icon="notifications" color={theme.colors.primary} size={44} outline />
          <View style={styles.text}>
            <AppText variant="bodyStrong">Remind me every evening</AppText>
            <AppText variant="caption" tone="muted">
              One local notification. Nothing is sent anywhere.
            </AppText>
          </View>
          <Switch
            value={settings.reminderEnabled}
            onValueChange={(value) => void toggle(value)}
            trackColor={{ true: theme.colors.primary, false: theme.colors.borderStrong }}
            thumbColor="#FFFFFF"
          />
        </View>
      </Card>
      {settings.reminderEnabled ? (
        <TimeField
          hour={settings.reminderHour}
          minute={settings.reminderMinute}
          onChange={(hour, minute) =>
            void mutate((s) =>
              s.setup.updateSettings({ reminderHour: hour, reminderMinute: minute }),
            )
          }
        />
      ) : null}
      {preview ? (
        <View style={styles.previewBlock}>
          <AppText variant="labelStrong">Preview</AppText>
          <Card muted>
            <AppText variant="bodyStrong">{preview.title}</AppText>
            <AppText variant="caption" tone="muted">
              {preview.body}
            </AppText>
          </Card>
          <AppText variant="caption" tone="subtle">
            If receipts are waiting for amounts, the reminder mentions them.
          </AppText>
        </View>
      ) : null}
      {permission.data === 'denied' ? (
        <Card style={{ backgroundColor: theme.colors.warningSoft, borderColor: 'transparent' }}>
          <AppText variant="bodyStrong">Notifications are blocked</AppText>
          <AppText variant="caption" tone="muted">
            Allow notifications for Pocket Ledger in your phone settings, then turn the reminder on
            again.
          </AppText>
          <Button
            label="Open phone settings"
            variant="secondary"
            size="sm"
            onPress={() => void Linking.openSettings()}
            style={styles.settingsButton}
          />
        </Card>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  text: {
    flex: 1,
    gap: 2,
  },
  previewBlock: {
    gap: 8,
  },
  settingsButton: {
    marginTop: 10,
    alignSelf: 'flex-start',
  },
});
