import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Card } from '@/components/card';
import { IconBadge } from '@/components/icon-badge';
import { Screen } from '@/components/screen';
import { useTheme } from '@/design';

const POINTS = [
  {
    icon: 'phone-portrait',
    title: 'Stored on this phone only',
    copy: 'Your ledger lives in a local database inside the app, and receipt photos are copied into the app’s private folder. Nothing is uploaded.',
  },
  {
    icon: 'cloud-offline',
    title: 'Works without internet',
    copy: 'There is no account, no sync and no server. The app behaves the same with Wi-Fi off.',
  },
  {
    icon: 'notifications',
    title: 'Reminders are local',
    copy: 'The nightly reminder is scheduled on the device itself. No push service is involved.',
  },
  {
    icon: 'download',
    title: 'You can take your data with you',
    copy: 'Export every entry as a CSV file from Settings whenever you like.',
  },
  {
    icon: 'warning',
    title: 'Back up your phone',
    copy: 'Because nothing is in the cloud, deleting the app or losing the phone deletes the ledger. Your phone’s own backup (iCloud or Google) includes app data.',
  },
  {
    icon: 'calculator',
    title: 'Balances are always explainable',
    copy: 'Every balance is the sum of its entries. Adjustments are added as new entries; history is never rewritten.',
  },
];

export default function AboutScreen() {
  const theme = useTheme();
  return (
    <Screen header={{ title: 'Privacy & data', back: true }}>
      <AppText tone="muted">
        Pocket Ledger is a personal bookkeeping app. It records what you tell it and never moves
        real money.
      </AppText>
      {POINTS.map((point) => (
        <Card key={point.title}>
          <View style={styles.row}>
            <IconBadge icon={point.icon} color={theme.colors.primary} size={40} outline />
            <View style={styles.text}>
              <AppText variant="bodyStrong">{point.title}</AppText>
              <AppText variant="caption" tone="muted">
                {point.copy}
              </AppText>
            </View>
          </View>
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  text: {
    flex: 1,
    gap: 4,
  },
});
