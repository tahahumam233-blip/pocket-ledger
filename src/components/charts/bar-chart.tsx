import { StyleSheet, View } from 'react-native';
import Svg, { Rect } from 'react-native-svg';

import { useTheme, withAlpha } from '@/design';

import { AppText } from '../app-text';

export type BarDatum = { label: string; value: number; secondary?: number; highlight?: boolean };

type BarChartProps = {
  data: BarDatum[];
  height?: number;
  color?: string;
  secondaryColor?: string;
  formatValue?: (value: number) => string;
};

/** Paired vertical bars (e.g. spent vs received) with labels underneath. */
export function BarChart({
  data,
  height = 140,
  color,
  secondaryColor,
  formatValue,
}: BarChartProps) {
  const theme = useTheme();
  const primary = color ?? theme.colors.expense;
  const secondary = secondaryColor ?? theme.colors.income;
  const max = Math.max(1, ...data.flatMap((d) => [d.value, d.secondary ?? 0]));
  const hasSecondary = data.some((d) => d.secondary !== undefined);
  const chartHeight = height;
  const barWidth = hasSecondary ? 12 : 22;
  const gap = 4;
  const groupWidth = hasSecondary ? barWidth * 2 + gap : barWidth;

  return (
    <View style={styles.wrap}>
      <View style={[styles.chart, { height: chartHeight }]}>
        {data.map((datum) => {
          const primaryHeight = Math.max(2, Math.round((datum.value / max) * (chartHeight - 4)));
          const secondaryHeight = Math.max(
            2,
            Math.round(((datum.secondary ?? 0) / max) * (chartHeight - 4)),
          );
          const dim = datum.highlight === false;
          return (
            <View key={datum.label} style={styles.column}>
              <Svg width={groupWidth} height={chartHeight}>
                <Rect
                  x={0}
                  y={chartHeight - primaryHeight}
                  width={barWidth}
                  height={primaryHeight}
                  rx={barWidth / 2.6}
                  fill={dim ? withAlpha(primary, 0.35) : primary}
                />
                {hasSecondary ? (
                  <Rect
                    x={barWidth + gap}
                    y={chartHeight - secondaryHeight}
                    width={barWidth}
                    height={secondaryHeight}
                    rx={barWidth / 2.6}
                    fill={dim ? withAlpha(secondary, 0.35) : secondary}
                  />
                ) : null}
              </Svg>
            </View>
          );
        })}
      </View>
      <View style={styles.labels}>
        {data.map((datum) => (
          <View key={datum.label} style={styles.column}>
            <AppText variant="caption" tone={datum.highlight ? 'text' : 'muted'} align="center">
              {datum.label}
            </AppText>
            {formatValue ? (
              <AppText variant="micro" tone="subtle" align="center" numberOfLines={1}>
                {formatValue(datum.value)}
              </AppText>
            ) : null}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 8,
  },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  labels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  column: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
});
