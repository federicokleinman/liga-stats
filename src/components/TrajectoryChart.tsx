'use client';

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

interface DataPoint {
  temporadaId: number;
  divisional: string;
  posicion: number;
  puntos: number;
}

const DIV_MAP: Record<string, number> = { A: 1, B: 2, C: 3, D: 4, E: 5, F: 6, G: 7 };

export function TrajectoryChart({ data }: { data: DataPoint[] }) {
  const chartData = data.map((d) => ({
    temporada: `T${d.temporadaId}`,
    divisionalNum: DIV_MAP[d.divisional] || 8,
    divisional: d.divisional,
    posicion: d.posicion,
    puntos: d.puntos,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-gray-400 mb-2">Divisional por Temporada (A=mejor, G=peor)</h3>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="temporada" stroke="#6b7280" fontSize={11} />
              <YAxis reversed domain={[1, 7]} ticks={[1, 2, 3, 4, 5, 6, 7]}
                tickFormatter={(v: number) => String.fromCharCode(64 + v)}
                stroke="#6b7280" fontSize={11}
              />
              <Tooltip
                contentStyle={{ background: '#111827', border: '1px solid #1e293b', borderRadius: 8 }}
                labelStyle={{ color: '#9ca3af' }}
                formatter={(value) => [String.fromCharCode(64 + Number(value)), 'Divisional']}
              />
              <Line
                type="stepAfter"
                dataKey="divisionalNum"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ fill: '#3b82f6', r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-gray-400 mb-2">Puntos por Temporada</h3>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="temporada" stroke="#6b7280" fontSize={11} />
              <YAxis stroke="#6b7280" fontSize={11} />
              <Tooltip
                contentStyle={{ background: '#111827', border: '1px solid #1e293b', borderRadius: 8 }}
                labelStyle={{ color: '#9ca3af' }}
                formatter={(value) => [Number(value), 'Puntos']}
              />
              <Line
                type="monotone"
                dataKey="puntos"
                stroke="#10b981"
                strokeWidth={2}
                dot={{ fill: '#10b981', r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
