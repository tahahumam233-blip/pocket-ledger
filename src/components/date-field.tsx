import DateTimePicker from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/design';
import {
  addDays,
  formatDateLabel,
  type IsoDate,
  parseIsoDate,
  todayIsoDate,
  toIsoDate,
} from '@/domain';

import { BottomSheet } from './bottom-sheet';
import { Button } from './button';
import { Chip } from './chip';

type DateFieldProps = {
  value: IsoDate;
  onChange: (next: IsoDate) => void;
};

/** Quick chips for the common cases plus the iPhone calendar for anything else. */
export function DateField({ value, onChange }: DateFieldProps) {
  const theme = useTheme();
  const today = todayIsoDate();
  const yesterday = addDays(today, -1);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  const custom = value !== today && value !== yesterday;

  const openPicker = () => {
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
        <DateTimePicker
          value={parseIsoDate(draft)}
          mode="date"
          display="inline"
          themeVariant={theme.isDark ? 'dark' : 'light'}
          accentColor={theme.colors.primary}
          maximumDate={parseIsoDate(addDays(today, 365))}
          onValueChange={(_event, date) => setDraft(toIsoDate(date))}
        />
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
});
