import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { useTheme } from '@/design';
import { formatClockTime } from '@/domain';

import { AppText } from './app-text';
import { BottomSheet } from './bottom-sheet';
import { Button } from './button';
import { TextField } from './form-row';
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

/** Picks a time of day with the native clock on each platform. */
export function TimeField({ hour, minute, onChange, label = 'Remind me at' }: TimeFieldProps) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(() => toDate(hour, minute));
  const [text, setText] = useState(
    `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
  );

  const openPicker = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: toDate(hour, minute),
        mode: 'time',
        is24Hour: false,
        onValueChange: (_event, date) => onChange(date.getHours(), date.getMinutes()),
      });
      return;
    }
    setDraft(toDate(hour, minute));
    setOpen(true);
  };

  const applyText = () => {
    const match = /^(\d{1,2}):(\d{2})$/.exec(text.trim());
    if (!match) return;
    const h = Number(match[1]);
    const m = Number(match[2]);
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) onChange(h, m);
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
        {Platform.OS === 'ios' ? (
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
        ) : (
          <View style={styles.webField}>
            <AppText tone="muted">Enter a 24-hour time, for example 21:30</AppText>
            <TextField
              value={text}
              onChangeText={setText}
              placeholder="21:00"
              keyboardType="numbers-and-punctuation"
            />
          </View>
        )}
        <Button
          label="Use this time"
          onPress={() => {
            if (Platform.OS === 'ios') onChange(draft.getHours(), draft.getMinutes());
            else applyText();
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
  webField: {
    gap: 8,
  },
});
