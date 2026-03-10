'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useMetrics, useTorneo } from '@/lib/hooks';
import { ComparisonBarChart } from '@/components/ComparisonBarChart';
import { ComparisonRadarChart } from '@/components/ComparisonRadarChart';
import { WhatsAppShare } from '@/components/WhatsAppShare';
import type { TeamSummary } from '@/lib/types';
import Link from 'next/link';

// ── Team search dropdown ──────────────────────────────────────────
function TeamPicker({
  label,
  value,
  onChange,
  allTeams,
  exclude,
}: {
  label: string;
  value: string;
  onChange: (id: string) => void;
  allTeams: TeamSummary[];
  exclude?: string;
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);

  const selected = allTeams.find((t) => t.teamId === value);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return allTeams
      .filter((t) => t.teamId !== exclude && t.nombre.toLowerCase().includes(q))
      .slice(0, 20);
  }, [allTeams, query, exclude]);

  function pick(team: TeamSummary) {
    onChange(team.teamId);
    setQuery('');
    setOpen(false);
  }

  return (
    <div className="relative">
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full text-left px-3 py-2 bg-[#1e293b] border border-[#334155] rounded-lg text-sm text-white hover:border-blue-500 transition-colors flex items-center justify-between"
      >
        <span className={selected ? 'text-white' : 'text-gray-500'}>
          {selected ? selected.nombre : 'Elegir equipo\u2026'}
        </span>
        <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-[#1e293b] border border-[#334155] rounded-lg shadow-xl">
          <div className="p-2">
            <input
              autoFocus
              type="text"
              placeholder="Buscar equipo\u2026"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full px-3 py-1.5 bg-[#0f172a] border border-[#334155] rounded text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
          </div>
          <ul className="max-h-52 overflow-y-auto divide-y divide-[#334155]">
            {filtered.length === 0 && (
              <li className="px-3 py-2 text-sm text-gray-500">Sin resultados</li>
            )}
            {filtered.map((t) => (
              <li key={t.teamId}>
                <button
                  onClick={() => pick(t)}
                  className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-[#334155] hover:text-white transition-colors"
                >
                  {t.nombre}
                  <span className="ml-2 text-xs text-gray-500">{t.temporadas} temp.</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ── KPI builder ───────────────────────────────────────────────────
function buildKPIs(t1: TeamSummary, t2: TeamSummary) {
  const gfpj1 = t1.totalPJ > 0 ? t1.totalGF / t1.totalPJ : 0;
  const gcpj1 = t1.totalPJ > 0 ? t1.totalGC / t1.totalPJ : 0;
  const gfpj2 = t2.totalPJ > 0 ? t2.totalGF / t2.totalPJ : 0;
  const gcpj2 = t2.totalPJ > 0 ? t2.totalGC / t2.totalPJ : 0;

  return [
    { label: 'Campeonatos', icon: '🏆', v1: t1.campeonatos, v2: t2.campeonatos },
    { label: 'Temporadas', icon: '📅', v1: t1.temporadas, v2: t2.temporadas },
    {
      label: 'Mejor Posición',
      icon: '🥇',
      v1: t1.mejorPosicion,
      v2: t2.mejorPosicion,
      format: (v: number) => `#${v}`,
      lowerIsBetter: true,
    },
    {
      label: 'Prom. Pts',
      icon: '📊',
      v1: t1.promedioPuntos,
      v2: t2.promedioPuntos,
      format: (v: number) => v.toFixed(1),
    },
    {
      label: 'GF/PJ',
      icon: '⚽',
      v1: gfpj1,
      v2: gfpj2,
      format: (v: number) => v.toFixed(2),
    },
    {
      label: 'GC/PJ',
      icon: '🛡️',
      v1: gcpj1,
      v2: gcpj2,
      format: (v: number) => v.toFixed(2),
      lowerIsBetter: true,
    },
  ];
}

// ── Main team comparison view ─────────────────────────────────────
export function TeamComparison() {
  const [torneo] = useTorneo();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const { metrics, loading } = useMetrics(torneo);

  const [id1, setId1] = useState(searchParams.get('equipo1') || '');
  const [id2, setId2] = useState(searchParams.get('equipo2') || '');

  // Sync selections to URL
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    if (id1) params.set('equipo1', id1); else params.delete('equipo1');
    if (id2) params.set('equipo2', id2); else params.delete('equipo2');
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [id1, id2]); // eslint-disable-line react-hooks/exhaustive-deps

  const allTeams: TeamSummary[] = useMemo(() => {
    if (!metrics?.teamSummaries) return [];
    return Object.values(metrics.teamSummaries).sort((a, b) =>
      a.nombre.localeCompare(b.nombre)
    );
  }, [metrics]);

  const team1 = allTeams.find((t) => t.teamId === id1) ?? null;
  const team2 = allTeams.find((t) => t.teamId === id2) ?? null;

  const kpis = team1 && team2 ? buildKPIs(team1, team2) : null;

  return (
    <div className="space-y-8">
      {/* Team selectors */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {loading ? (
          <>
            <div className="h-10 bg-[#1e293b] rounded-lg animate-pulse" />
            <div className="h-10 bg-[#1e293b] rounded-lg animate-pulse" />
          </>
        ) : (
          <>
            <TeamPicker
              label="Equipo 1"
              value={id1}
              onChange={setId1}
              allTeams={allTeams}
              exclude={id2}
            />
            <TeamPicker
              label="Equipo 2"
              value={id2}
              onChange={setId2}
              allTeams={allTeams}
              exclude={id1}
            />
          </>
        )}
      </div>

      {/* Prompt to pick teams */}
      {(!id1 || !id2) && !loading && (
        <div className="text-center py-16 text-gray-500">
          <p className="text-4xl mb-4">⚔️</p>
          <p className="text-lg">Elegí dos equipos para comparar sus estadísticas históricas.</p>
        </div>
      )}

      {/* Charts */}
      {kpis && team1 && team2 && (
        <>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-4 text-sm">
              <span className="flex items-center gap-2">
                <span className="inline-block w-3 h-3 rounded-full bg-[#3b82f6]" />
                <span className="font-medium text-white">{team1.nombre}</span>
              </span>
              <span className="text-gray-500">vs</span>
              <span className="flex items-center gap-2">
                <span className="inline-block w-3 h-3 rounded-full bg-[#f97316]" />
                <span className="font-medium text-white">{team2.nombre}</span>
              </span>
            </div>
            <WhatsAppShare
              text={`Comparativa histórica: ${team1.nombre} vs ${team2.nombre} — Liga Universitaria`}
              url={typeof window !== 'undefined' ? window.location.href : ''}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-[#1a2234] rounded-2xl p-6 border border-[#1e293b]">
              <h2 className="text-base font-semibold mb-6 text-gray-200">KPIs comparados</h2>
              <ComparisonBarChart
                team1={team1.nombre}
                team2={team2.nombre}
                kpis={kpis}
              />
            </div>

            <div className="bg-[#1a2234] rounded-2xl p-6 border border-[#1e293b]">
              <h2 className="text-base font-semibold mb-2 text-gray-200">Perfil comparativo</h2>
              <p className="text-xs text-gray-500 mb-4">
                Valores normalizados entre los dos equipos. Para GC/PJ y Mejor Posición, menos es mejor.
              </p>
              <ComparisonRadarChart
                team1={team1.nombre}
                team2={team2.nombre}
                kpis={kpis}
              />
            </div>
          </div>

          {/* Stats table */}
          <div className="bg-[#1a2234] rounded-2xl border border-[#1e293b] overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#1e293b]">
                  <th className="px-4 py-3 text-left text-gray-400 font-medium">Métrica</th>
                  <th className="px-4 py-3 text-center font-medium" style={{ color: '#3b82f6' }}>
                    {team1.nombre}
                  </th>
                  <th className="px-4 py-3 text-center font-medium" style={{ color: '#f97316' }}>
                    {team2.nombre}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e293b]">
                {kpis.map((k) => {
                  const fmt = k.format ?? ((v: number) => String(v));
                  const lib = k.lowerIsBetter ?? false;
                  const better1 = lib ? k.v1 < k.v2 : k.v1 > k.v2;
                  const better2 = lib ? k.v2 < k.v1 : k.v2 > k.v1;
                  return (
                    <tr key={k.label} className="hover:bg-[#1e293b]/50 transition-colors">
                      <td className="px-4 py-3 text-gray-300">
                        {k.icon} {k.label}
                      </td>
                      <td
                        className={`px-4 py-3 text-center font-semibold ${better1 ? 'text-[#3b82f6]' : 'text-gray-300'}`}
                      >
                        {fmt(k.v1)}
                        {better1 && <span className="ml-1 text-xs">▲</span>}
                      </td>
                      <td
                        className={`px-4 py-3 text-center font-semibold ${better2 ? 'text-[#f97316]' : 'text-gray-300'}`}
                      >
                        {fmt(k.v2)}
                        {better2 && <span className="ml-1 text-xs">▲</span>}
                      </td>
                    </tr>
                  );
                })}
                <tr className="border-t border-[#334155]">
                  <td className="px-4 py-3 text-gray-400">Total PJ</td>
                  <td className="px-4 py-3 text-center text-gray-300">{team1.totalPJ}</td>
                  <td className="px-4 py-3 text-center text-gray-300">{team2.totalPJ}</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 text-gray-400">Total GF</td>
                  <td className="px-4 py-3 text-center text-gray-300">{team1.totalGF}</td>
                  <td className="px-4 py-3 text-center text-gray-300">{team2.totalGF}</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 text-gray-400">Total GC</td>
                  <td className="px-4 py-3 text-center text-gray-300">{team1.totalGC}</td>
                  <td className="px-4 py-3 text-center text-gray-300">{team2.totalGC}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="text-center pt-2">
            <p className="text-gray-500 text-sm">
              ¿Ves algo incorrecto?{' '}
              <Link href="/contacto" className="text-blue-400 hover:underline">
                Reportar un error
              </Link>
            </p>
          </div>
        </>
      )}
    </div>
  );
}
