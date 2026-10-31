import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/design';
import { formatClockTime } from '@/domain';

import { AppText } from './app-text';
import { Icon } from './icon';

type TimeFieldProps = {
  hour: number;
  minute: number;
  onChange: (hour: number, minute: number) => void;
  label?: string;
};

const pad = (value: number) => String(value).padStart(2, '0');

/** Rounds to the nearest five minutes; calendar reminders are published in 5-minute steps. */
export function roundToFiveMinutes(hour: number, minute: number): { hour: number; minute: number } {
  const total = (hour * 60 + Math.round(minute / 5) * 5) % (24 * 60);
  return { hour: Math.floor(total / 60), minute: total % 60 };
}

/** Web version: a row that hides a native time input, which opens the iPhone time wheel. */
export function TimeField({ hour, minute, onChange, label = 'Remind me at' }: TimeFieldProps) {
  const theme = useTheme();
  return (
    <View
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
      <input
        type="time"
        aria-label={label}
        step={300}
        value={`${pad(hour)}:${pad(minute)}`}
        onChange={(event) => {
          const match = /^(\d{2}):(\d{2})/.exec(event.currentTarget.value);
          if (!match) return;
          const rounded = roundToFiveMinutes(Number(match[1]), Number(match[2]));
          onChange(rounded.hour, rounded.minute);
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
  );
}

const styles = StyleSheet.create({
  row: {
    position: 'relative',
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
});
