import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Icon } from '@/components/icon';
import { TimeField } from '@/components/time-field';
import { useTheme } from '@/design';
import { formatClockTime } from '@/domain';
import { openReminderCalendar } from '@/platform/calendar-reminder';

type CalendarReminderCardProps = {
  hour: number;
  minute: number;
  added: boolean;
  onChangeTime: (hour: number, minute: number) => void;
  /** Called after the calendar file was opened. */
  onAdded: () => void;
};

const STEPS = [
  'Your iPhone shows the event “Record today’s spending”. Tap Add to Calendar.',
  'Each evening the alert appears like any notification, even with the app closed.',
  'Changed the time? Add it again, then delete the old event in Calendar if you see two.',
];

/**
 * The web app's nightly reminder: a daily repeating Calendar event with an
 * alert. It is set up once and then works even when the app is closed.
 */
export function CalendarReminderCard({
  hour,
  minute,
  added,
  onChangeTime,
  onAdded,
}: CalendarReminderCardProps) {
  const theme = useTheme();
  const time = formatClockTime(hour, minute);
  return (
    <View style={styles.wrap}>
      <TimeField hour={hour} minute={minute} onChange={onChangeTime} />
      <Button
        label={added ? `Add ${time} reminder again` : `Add ${time} reminder to Calendar`}
        icon="calendar"
        size="lg"
        variant={added ? 'secondary' : 'primary'}
        onPress={() => {
          openReminderCalendar(hour, minute);
          onAdded();
        }}
        fullWidth
        testID="add-calendar-reminder"
      />
      <Card muted>
        <View style={styles.steps}>
          {STEPS.map((line, index) => (
            <View key={line} style={styles.step}>
              <View style={[styles.number, { backgroundColor: theme.colors.primarySoft }]}>
                <AppText variant="captionStrong" tone="primary">
                  {index + 1}
                </AppText>
              </View>
              <AppText variant="caption" tone="muted" style={styles.stepText}>
                {line}
              </AppText>
            </View>
          ))}
        </View>
      </Card>
      <View style={styles.note}>
        <Icon name="information-circle" size={16} color={theme.colors.textSubtle} outline />
        <AppText variant="caption" tone="subtle" style={styles.stepText}>
          Web apps on iPhone cannot schedule their own notifications without a server, so the
          reminder lives in your Calendar instead. Nothing about your spending is shared.
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 12,
  },
  steps: {
    gap: 10,
  },
  step: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  number: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepText: {
    flex: 1,
  },
  note: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'flex-start',
  },
});
