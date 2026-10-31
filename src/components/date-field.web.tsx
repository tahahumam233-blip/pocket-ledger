import { StyleSheet, View } from 'react-native';

import { addDays, formatDateLabel, type IsoDate, isValidIsoDate, todayIsoDate } from '@/domain';

import { Chip } from './chip';

type DateFieldProps = {
  value: IsoDate;
  onChange: (next: IsoDate) => void;
};

const overlay = {
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
} as const;

/**
 * Web version: the "Pick a date" chip hides a native date input, so tapping it
 * opens the iPhone's own date wheel.
 */
export function DateField({ value, onChange }: DateFieldProps) {
  const today = todayIsoDate();
  const yesterday = addDays(today, -1);
  const custom = value !== today && value !== yesterday;

  return (
    <View style={styles.row}>
      <Chip label="Today" selected={value === today} onPress={() => onChange(today)} icon="today" />
      <Chip label="Yesterday" selected={value === yesterday} onPress={() => onChange(yesterday)} />
      <View style={styles.pickerChip}>
        <Chip
          label={custom ? formatDateLabel(value, today) : 'Pick a date'}
          selected={custom}
          icon="calendar"
        />
        <input
          type="date"
          aria-label="Pick a date"
          value={value}
          max={addDays(today, 365)}
          onChange={(event) => {
            const next = event.currentTarget.value;
            if (isValidIsoDate(next)) onChange(next);
          }}
          style={overlay}
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
