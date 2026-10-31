import DateTimePicker from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/design';
import { formatClockTime } from '@/domain';

import { AppText } from './app-text';
import { BottomSheet } from './bottom-sheet';
import { Button } from './button';
import { Icon } from './icon';
import { PressableScale } from './pressable-scale';

type TimeFieldProps = {
  hour: number;
  minute: number;
  onChange: (hour: number, minute: number) => void;
  label?: string;
};

function toDate(hour: number, minute: number) {
  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  return date;
}

/** Picks a time of day with the iPhone time wheel. */
export function TimeField({ hour, minute, onChange, label = 'Remind me at' }: TimeFieldProps) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(() => toDate(hour, minute));

  const openPicker = () => {
    setDraft(toDate(hour, minute));
    setOpen(true);
  };

  return (
    <>
      <PressableScale
        onPress={openPicker}
        accessibilityRole="button"
        accessibilityLabel={`${label} ${formatClockTime(hour, minute)}`}
        style={[
          styles.row,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
            borderRadius: theme.radii.lg,
          },
        ]}
      >
        <Icon name="alarm" size={20} color={theme.colors.primary} outline />
        <AppText variant="bodyMedium" style={styles.label}>
          {label}
        </AppText>
        <AppText variant="subheading" tone="primary">
          {formatClockTime(hour, minute)}
        </AppText>
        <Icon name="chevron-forward" size={16} color={theme.colors.textSubtle} />
      </PressableScale>
      <BottomSheet
        visible={open}
        onClose={() => setOpen(false)}
        title="Reminder time"
        scroll={false}
      >
        <View style={styles.center}>
          <DateTimePicker
            value={draft}
            mode="time"
            display="spinner"
            minuteInterval={5}
            themeVariant={theme.isDark ? 'dark' : 'light'}
            onValueChange={(_event, date) => setDraft(date)}
          />
        </View>
        <Button
          label="Use this time"
          onPress={() => {
            onChange(draft.getHours(), draft.getMinutes());
            setOpen(false);
          }}
          fullWidth
        />
      </BottomSheet>
    </>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
  },
  label: {
    flex: 1,
  },
  center: {
    alignItems: 'center',
  },
});
