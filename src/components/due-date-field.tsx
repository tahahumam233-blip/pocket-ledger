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

type DueDateFieldProps = {
  value: IsoDate | null;
  onChange: (next: IsoDate | null) => void;
};

/** "When should this be settled?": none, quick picks, or a date from the calendar. */
export function DueDateField({ value, onChange }: DueDateFieldProps) {
  const theme = useTheme();
  const today = todayIsoDate();
  const inWeek = addDays(today, 7);
  const inMonth = addDays(today, 30);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value ?? inMonth);
  const custom = value !== null && value !== inWeek && value !== inMonth;
  return (
    <View style={styles.row}>
      <Chip label="No date" selected={value === null} onPress={() => onChange(null)} />
      <Chip label="In a week" selected={value === inWeek} onPress={() => onChange(inWeek)} />
      <Chip label="In a month" selected={value === inMonth} onPress={() => onChange(inMonth)} />
      <Chip
        label={custom && value ? formatDateLabel(value, today) : 'Pick a date'}
        selected={custom}
        icon="calendar"
        onPress={() => {
          setDraft(value ?? inMonth);
          setOpen(true);
        }}
      />
      <BottomSheet visible={open} onClose={() => setOpen(false)} title="Due date" scroll={false}>
        <DateTimePicker
          value={parseIsoDate(draft)}
          mode="date"
          display="inline"
          themeVariant={theme.isDark ? 'dark' : 'light'}
          accentColor={theme.colors.primary}
          onValueChange={(_event, date) => setDraft(toIsoDate(date))}
        />
        <Button
          label={`Use ${formatDateLabel(draft, today)}`}
          onPress={() => {
            onChange(draft);
            setOpen(false);
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
