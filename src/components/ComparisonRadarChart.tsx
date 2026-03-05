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

const COLOR1 = '#3b82f6'; // blue
const COLOR2 = '#f97316'; // orange

export function ComparisonRadarChart({
  team1,
  team2,
  kpis,
  color1 = COLOR1,
  color2 = COLOR2,
}: Props) {
  // Ratio-based normalization: winner always gets 100, loser gets (min/max)*100.
  // This preserves real proportions — e.g. GC/PJ 0.93 vs 1.13 → 100 vs 82, not 100 vs 0.
  // When both values are equal, both get 100. When both are 0, both get 50.
  const data = kpis.map((k) => {
    const lo = Math.min(k.v1, k.v2);
    const hi = Math.max(k.v1, k.v2);

    let n1: number, n2: number;

    if (hi === 0) {
      // Both zero — show as equal and mid-sized
      n1 = 50; n2 = 50;
    } else {
      const ratio = (lo / hi) * 100; // e.g. 82.3

      if (k.lowerIsBetter) {
        // Lower raw value = better → the team with lo wins
        n1 = k.v1 <= k.v2 ? 100 : ratio;
        n2 = k.v2 <= k.v1 ? 100 : ratio;
      } else {
        // Higher raw value = better → the team with hi wins
        n1 = k.v1 >= k.v2 ? 100 : ratio;
        n2 = k.v2 >= k.v1 ? 100 : ratio;
      }
    }

    return {
      metric: `${k.icon} ${k.label}`,
      [team1]: parseFloat(n1.toFixed(1)),
      [team2]: parseFloat(n2.toFixed(1)),
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
