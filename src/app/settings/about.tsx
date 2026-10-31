import { Platform, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Card } from '@/components/card';
import { IconBadge } from '@/components/icon-badge';
import { Screen } from '@/components/screen';
import { useTheme } from '@/design';

const NATIVE_POINTS = [
  {
    icon: 'phone-portrait',
    title: 'Stored on this phone only',
    copy: 'Your ledger lives in a local database inside the app, and receipt photos are copied into the app\u2019s private folder. Nothing is uploaded.',
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
    icon: 'cloud-upload',
    title: 'Back up to a file you keep',
    copy: 'Settings \u2192 Back up now saves everything, photos included, to Files or iCloud Drive. Restore it on a new phone.',
  },
  {
    icon: 'calculator',
    title: 'Balances are always explainable',
    copy: 'Every balance is the sum of its entries. Adjustments are added as new entries; history is never rewritten.',
  },
];

const WEB_POINTS = [
  {
    icon: 'phone-portrait',
    title: 'Stored on this iPhone only',
    copy: 'Entries and receipt photos are kept in the installed app\u2019s private storage. Nothing is uploaded, and the web address only delivers the app itself.',
  },
  {
    icon: 'cloud-offline',
    title: 'Works without internet',
    copy: 'After the first visit the whole app is saved on the phone. There is no account, no sync and no server.',
  },
  {
    icon: 'warning',
    title: 'Back up regularly',
    copy: 'Removing the app from your Home Screen deletes its data. Use Settings \u2192 Back up now and keep the file in iCloud Drive or Files. Restore it any time.',
  },
  {
    icon: 'calendar',
    title: 'Reminders live in your Calendar',
    copy: 'The nightly reminder is a repeating event with an alert in your own Calendar, so it works even when the app is closed.',
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
      {(Platform.OS === 'web' ? WEB_POINTS : NATIVE_POINTS).map((point) => (
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
