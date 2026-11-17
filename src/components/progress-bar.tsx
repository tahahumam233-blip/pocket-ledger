import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/design';

type ProgressBarProps = {
  /** Share filled, from 0; anything above 1 shows as full. */
  ratio: number;
  color: string;
  /** Where an even pace would be by today, from 0 to 1, drawn as a thin mark. */
  marker?: number | null;
  height?: number;
  accessibilityLabel?: string;
};

/** A rounded bar that fills from the left, with an optional mark for where the pace should be. */
export function ProgressBar({
  ratio,
  color,
  marker,
  height = 8,
  accessibilityLabel,
}: ProgressBarProps) {
  const theme = useTheme();
  const filled = Math.max(0, Math.min(ratio, 1));
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(Math.min(ratio, 1) * 100) }}
      style={[
        styles.track,
        { height, borderRadius: height / 2, backgroundColor: theme.colors.surfaceMuted },
      ]}
    >
      <View
        style={[
          styles.fill,
          {
            width: `${filled * 100}%`,
            minWidth: ratio > 0 ? height : 0,
            borderRadius: height / 2,
            backgroundColor: color,
          },
        ]}
      />
      {marker !== null && marker !== undefined && marker > 0 && marker < 1 ? (
        <View
          style={[
            styles.marker,
            {
              left: `${marker * 100}%`,
              height: height + 6,
              top: -3,
              backgroundColor: theme.colors.textMuted,
            },
          ]}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: '100%',
    overflow: 'visible',
  },
  fill: {
    height: '100%',
  },
  marker: {
    position: 'absolute',
    width: 2,
    marginLeft: -1,
    borderRadius: 1,
  },
});
