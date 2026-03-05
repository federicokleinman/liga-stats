'use client';

import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
  Legend,
} from 'recharts';

export interface RadarKPI {
  label: string;
  icon: string;
  v1: number;
  v2: number;
  /** If true, lower raw value = better (we invert for the chart) */
  lowerIsBetter?: boolean;
}

interface Props {
  team1: string;
  team2: string;
  kpis: RadarKPI[];
  color1?: string;
  color2?: string;
}

const COLOR1 = '#2dd4bf';
const COLOR2 = '#db2777';

export function ComparisonRadarChart({
  team1,
  team2,
  kpis,
  color1 = COLOR1,
  color2 = COLOR2,
}: Props) {
  // Normalize each metric to 0-1 relative to the max of both teams.
  // For "lowerIsBetter" metrics, invert after normalization.
  const data = kpis.map((k) => {
    const max = Math.max(k.v1, k.v2) || 1;
    let n1 = k.v1 / max;
    let n2 = k.v2 / max;
    if (k.lowerIsBetter) {
      // Flip: if v1=0.3 and v2=1.0, lower is better so v1 should score higher
      n1 = 1 - n1 + (1 - n2); // simplest: invert relative to each other
      n2 = 0;
      // Better approach: if min of both = best, map [min,max] → [1,0]
      const minV = Math.min(k.v1, k.v2);
      const maxV = Math.max(k.v1, k.v2);
      const range = maxV - minV || 1;
      n1 = 1 - (k.v1 - minV) / range;
      n2 = 1 - (k.v2 - minV) / range;
    }

    return {
      metric: `${k.icon} ${k.label}`,
      [team1]: parseFloat((n1 * 100).toFixed(1)),
      [team2]: parseFloat((n2 * 100).toFixed(1)),
    };
  });

  return (
    <ResponsiveContainer width="100%" height={320}>
      <RadarChart data={data} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
        <PolarGrid stroke="#1e293b" />
        <PolarAngleAxis
          dataKey="metric"
          tick={{ fill: '#9ca3af', fontSize: 11 }}
        />
        <Radar
          name={team1}
          dataKey={team1}
          stroke={color1}
          fill={color1}
          fillOpacity={0.25}
          strokeWidth={2}
        />
        <Radar
          name={team2}
          dataKey={team2}
          stroke={color2}
          fill={color2}
          fillOpacity={0.25}
          strokeWidth={2}
        />
        <Legend
          formatter={(value) => (
            <span style={{ color: '#d1d5db', fontSize: 12 }}>{value}</span>
          )}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}
