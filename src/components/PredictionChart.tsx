'use client';

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from 'recharts';
import type { PredictionResult } from '@/lib/types';

interface Props {
  teams: PredictionResult[];
}

const GOLD = '#eab308';
const GREEN = '#22c55e';
const RED = '#ef4444';

export function PredictionChart({ teams }: Props) {
  // Sort by champion probability for the chart
  const sorted = [...teams].sort((a, b) => b.pChampion - a.pChampion);

  const data = sorted.map((t) => ({
    nombre: t.nombre.length > 18 ? t.nombre.slice(0, 16) + '…' : t.nombre,
    fullName: t.nombre,
    campeon: Math.round(t.pChampion * 100),
    top4: Math.round(t.pTop4 * 100),
    descenso: Math.round(t.pBottom4 * 100),
  }));

  return (
    <div className="space-y-8">
      {/* Champion probability */}
      <div>
        <h3 className="text-sm font-semibold text-gray-400 mb-3">Probabilidad de Campeón (%)</h3>
        <div className="w-full" style={{ height: Math.max(300, teams.length * 32) }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ left: 10, right: 30 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
              <XAxis type="number" stroke="#6b7280" fontSize={11} unit="%" />
              <YAxis
                type="category"
                dataKey="nombre"
                stroke="#6b7280"
                fontSize={11}
                width={160}
                tick={{ fill: '#d1d5db' }}
              />
              <Tooltip
                contentStyle={{ background: '#1e293b', border: 'none', borderRadius: 8, fontSize: 13 }}
                labelStyle={{ color: '#e5e7eb' }}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter={(value: any) => [`${value}%`, 'Campeón']}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                labelFormatter={(label: any, payload: any) => {
                  const item = payload?.[0]?.payload;
                  return item?.fullName || label;
                }}
              />
              <Bar dataKey="campeon" radius={[0, 4, 4, 0]}>
                {data.map((entry, i) => (
                  <Cell key={i} fill={entry.campeon > 0 ? GOLD : '#374151'} fillOpacity={0.3 + (entry.campeon / Math.max(...data.map(d => d.campeon || 1))) * 0.7} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Risk profile: top4 vs relegation */}
      <div>
        <h3 className="text-sm font-semibold text-gray-400 mb-3">Top 4 vs Descenso (%)</h3>
        <div className="w-full" style={{ height: Math.max(300, teams.length * 32) }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ left: 10, right: 30 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
              <XAxis type="number" stroke="#6b7280" fontSize={11} unit="%" />
              <YAxis
                type="category"
                dataKey="nombre"
                stroke="#6b7280"
                fontSize={11}
                width={160}
                tick={{ fill: '#d1d5db' }}
              />
              <Tooltip
                contentStyle={{ background: '#1e293b', border: 'none', borderRadius: 8, fontSize: 13 }}
                labelStyle={{ color: '#e5e7eb' }}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter={(value: any, name: any) => [
                  `${value}%`,
                  name === 'top4' ? 'Top 4' : 'Descenso',
                ]}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                labelFormatter={(label: any, payload: any) => {
                  const item = payload?.[0]?.payload;
                  return item?.fullName || label;
                }}
              />
              <Bar dataKey="top4" fill={GREEN} fillOpacity={0.8} radius={[0, 4, 4, 0]} />
              <Bar dataKey="descenso" fill={RED} fillOpacity={0.8} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
