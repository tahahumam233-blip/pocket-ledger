import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { useTheme } from '@/design';
import {
  addDays,
  formatDateLabel,
  type IsoDate,
  parseIsoDate,
  todayIsoDate,
  toIsoDate,
} from '@/domain';

import { AppText } from './app-text';
import { BottomSheet } from './bottom-sheet';
import { Button } from './button';
import { Chip } from './chip';
import { TextField } from './form-row';

type DateFieldProps = {
  value: IsoDate;
  onChange: (next: IsoDate) => void;
};

/** Quick chips for the common cases plus a native calendar for anything else. */
export function DateField({ value, onChange }: DateFieldProps) {
  const theme = useTheme();
  const today = todayIsoDate();
  const yesterday = addDays(today, -1);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  const custom = value !== today && value !== yesterday;

  const openPicker = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: parseIsoDate(value),
        mode: 'date',
        maximumDate: parseIsoDate(addDays(today, 365)),
        onValueChange: (_event, date) => onChange(toIsoDate(date)),
      });
      return;
    }
    setDraft(value);
    setSheetOpen(true);
  };

  return (
    <View style={styles.row}>
      <Chip label="Today" selected={value === today} onPress={() => onChange(today)} icon="today" />
      <Chip label="Yesterday" selected={value === yesterday} onPress={() => onChange(yesterday)} />
      <Chip
        label={custom ? formatDateLabel(value, today) : 'Pick a date'}
        selected={custom}
        onPress={openPicker}
        icon="calendar"
      />
      <BottomSheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title="Choose a date"
        scroll={false}
      >
        {Platform.OS === 'ios' ? (
          <DateTimePicker
            value={parseIsoDate(draft)}
            mode="date"
            display="inline"
            themeVariant={theme.isDark ? 'dark' : 'light'}
            accentColor={theme.colors.primary}
            maximumDate={parseIsoDate(addDays(today, 365))}
            onValueChange={(_event, date) => setDraft(toIsoDate(date))}
          />
        ) : (
          <View style={styles.webPicker}>
            <AppText tone="muted">Type a date as YYYY-MM-DD</AppText>
            <TextField
              value={draft}
              onChangeText={setDraft}
              placeholder="2026-01-31"
              autoCapitalize="none"
            />
          </View>
        )}
        <Button
          label={`Use ${formatDateLabel(draft, today)}`}
          onPress={() => {
            onChange(draft);
            setSheetOpen(false);
          }}
          fullWidth
        />
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  webPicker: {
    gap: 8,
  },
});
