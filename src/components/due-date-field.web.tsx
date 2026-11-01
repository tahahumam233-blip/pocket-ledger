import { StyleSheet, View } from 'react-native';

import { addDays, formatDateLabel, type IsoDate, isValidIsoDate, todayIsoDate } from '@/domain';

import { Chip } from './chip';

type DueDateFieldProps = {
  value: IsoDate | null;
  onChange: (next: IsoDate | null) => void;
};

/** Web version: the "Pick a date" chip hides a native date input for the iPhone wheel. */
export function DueDateField({ value, onChange }: DueDateFieldProps) {
  const today = todayIsoDate();
  const inWeek = addDays(today, 7);
  const inMonth = addDays(today, 30);
  const custom = value !== null && value !== inWeek && value !== inMonth;
  return (
    <View style={styles.row}>
      <Chip label="No date" selected={value === null} onPress={() => onChange(null)} />
      <Chip label="In a week" selected={value === inWeek} onPress={() => onChange(inWeek)} />
      <Chip label="In a month" selected={value === inMonth} onPress={() => onChange(inMonth)} />
      <View style={styles.pickerChip}>
        <Chip
          label={custom && value ? formatDateLabel(value, today) : 'Pick a date'}
          selected={custom}
          icon="calendar"
        />
        <input
          type="date"
          aria-label="Settle by"
          value={value ?? ''}
          onChange={(event) => {
            const next = event.currentTarget.value;
            if (isValidIsoDate(next)) onChange(next);
          }}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            opacity: 0,
            fontSize: 16,
            border: 0,
            padding: 0,
            margin: 0,
            cursor: 'pointer',
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pickerChip: {
    position: 'relative',
  },
});
