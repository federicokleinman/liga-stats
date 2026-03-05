'use client';

export interface KPI {
  label: string;
  icon: string;
  v1: number;
  v2: number;
  format?: (v: number) => string;
  lowerIsBetter?: boolean;
}

interface Props {
  team1: string;
  team2: string;
  kpis: KPI[];
  color1?: string;
  color2?: string;
}

const COLOR1 = '#2dd4bf'; // teal
const COLOR2 = '#db2777'; // pink

export function ComparisonBarChart({
  team1,
  team2,
  kpis,
  color1 = COLOR1,
  color2 = COLOR2,
}: Props) {
  return (
    <div className="space-y-3">
      {kpis.map((k) => {
        const fmt = k.format ?? ((v: number) => String(v));
        const lib = k.lowerIsBetter ?? false;
        const max = Math.max(k.v1, k.v2) || 1;

        const winner1 = lib ? k.v1 <= k.v2 : k.v1 >= k.v2;
        const winner2 = lib ? k.v2 <= k.v1 : k.v2 >= k.v1;
        const tie = k.v1 === k.v2;

        return (
          <div key={k.label} className="space-y-1">
            <p className="text-xs text-gray-400 font-medium">
              {k.icon} {k.label}
            </p>

            {/* Team 1 bar */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-300 w-28 truncate text-right">{team1}</span>
              <div className="flex-1 bg-[#1e293b] rounded-full h-5 overflow-hidden">
                <div
                  className="h-full rounded-full flex items-center justify-end pr-2 transition-all duration-500"
                  style={{
                    width: `${(k.v1 / max) * 100}%`,
                    backgroundColor: color1,
                    opacity: tie ? 1 : winner1 ? 1 : 0.55,
                  }}
                >
                  <span className="text-xs font-bold text-white">{fmt(k.v1)}</span>
                </div>
              </div>
            </div>

            {/* Team 2 bar */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-300 w-28 truncate text-right">{team2}</span>
              <div className="flex-1 bg-[#1e293b] rounded-full h-5 overflow-hidden">
                <div
                  className="h-full rounded-full flex items-center justify-end pr-2 transition-all duration-500"
                  style={{
                    width: `${(k.v2 / max) * 100}%`,
                    backgroundColor: color2,
                    opacity: tie ? 1 : winner2 ? 1 : 0.55,
                  }}
                >
                  <span className="text-xs font-bold text-white">{fmt(k.v2)}</span>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
