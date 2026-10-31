import { View } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';

import { useTheme } from '@/design';

export type DonutSlice = { value: number; color: string; key: string };

type DonutChartProps = {
  slices: DonutSlice[];
  size?: number;
  thickness?: number;
  children?: React.ReactNode;
};

/** A ring chart drawn with stroked circle arcs; the center is free for a label. */
export function DonutChart({ slices, size = 180, thickness = 22, children }: DonutChartProps) {
  const theme = useTheme();
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const total = slices.reduce((sum, slice) => sum + Math.max(slice.value, 0), 0);
  const gap = slices.length > 1 ? 2 : 0;
  let offset = 0;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <G rotation={-90} origin={`${size / 2}, ${size / 2}`}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={theme.colors.surfaceMuted}
            strokeWidth={thickness}
            fill="none"
          />
          {total > 0
            ? slices.map((slice) => {
                const length = Math.max((slice.value / total) * circumference - gap, 0);
                const dashOffset = -offset;
                offset += (slice.value / total) * circumference;
                return (
                  <Circle
                    key={slice.key}
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke={slice.color}
                    strokeWidth={thickness}
                    strokeDasharray={`${length} ${circumference - length}`}
                    strokeDashoffset={dashOffset}
                    strokeLinecap="butt"
                    fill="none"
                  />
                );
              })
            : null}
        </G>
      </Svg>
      <View style={{ alignItems: 'center', paddingHorizontal: thickness + 8 }}>{children}</View>
    </View>
  );
}
