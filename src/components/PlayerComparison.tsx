'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { ComparisonBarChart } from '@/components/ComparisonBarChart';
import { ComparisonRadarChart } from '@/components/ComparisonRadarChart';
import { PlayerPicker } from '@/components/PlayerPicker';
import { WhatsAppShare } from '@/components/WhatsAppShare';
import { buildPlayerKPIs, RADAR_LABELS } from '@/lib/playerKPIs';
import type { PlayerSeason } from '@/lib/playerTypes';
import Link from 'next/link';

function normalizeName(name: string) {
  return name
    .toLowerCase()
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export function PlayerComparison() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [players, setPlayers] = useState<PlayerSeason[]>([]);
  const [loading, setLoading] = useState(true);

  const [id1, setId1] = useState(searchParams.get('jugador1') || '');
  const [id2, setId2] = useState(searchParams.get('jugador2') || '');

  // Fetch all players for T112
  useEffect(() => {
    fetch('/api/players?temporada=112&divisional=TODAS&torneo=Mayores%20Masculino')
      .then((r) => {
        if (!r.ok) throw new Error('No disponible');
        return r.json();
      })
      .then((data) => setPlayers(data.players || []))
      .catch(() => setPlayers([]))
      .finally(() => setLoading(false));
  }, []);

  // Sync selections to URL
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    if (id1) params.set('jugador1', id1); else params.delete('jugador1');
    if (id2) params.set('jugador2', id2); else params.delete('jugador2');
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [id1, id2]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sort players by goals desc for picker ordering
  const sortedPlayers = useMemo(
    () => [...players].sort((a, b) => b.goles - a.goles || b.pj - a.pj),
    [players],
  );

  const player1 = players.find((p) => p.playerId === id1) ?? null;
  const player2 = players.find((p) => p.playerId === id2) ?? null;

  const allKPIs = player1 && player2 ? buildPlayerKPIs(player1, player2) : null;
  const radarKPIs = allKPIs?.filter((k) => RADAR_LABELS.includes(k.label)) ?? null;

  return (
    <div className="space-y-8">
      {/* Player selectors */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {loading ? (
          <>
            <div className="h-10 bg-[#1e293b] rounded-lg animate-pulse" />
            <div className="h-10 bg-[#1e293b] rounded-lg animate-pulse" />
          </>
        ) : (
          <>
            <PlayerPicker
              label="Jugador 1"
              value={id1}
              onChange={setId1}
              players={sortedPlayers}
              exclude={id2}
            />
            <PlayerPicker
              label="Jugador 2"
              value={id2}
              onChange={setId2}
              players={sortedPlayers}
              exclude={id1}
            />
          </>
        )}
      </div>

      {/* Empty state */}
      {(!id1 || !id2) && !loading && (
        <div className="text-center py-16 text-gray-500">
          <p className="text-4xl mb-4">⚔️</p>
          <p className="text-lg">Elegí dos jugadores para comparar sus estadísticas.</p>
          <p className="text-sm mt-2 text-gray-600">Temporada 2025 — Mayores Masculino</p>
        </div>
      )}

      {/* Comparison */}
      {allKPIs && radarKPIs && player1 && player2 && (
        <>
          {/* Legend */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-4 text-sm">
              <span className="flex items-center gap-2">
                <span className="inline-block w-3 h-3 rounded-full bg-[#3b82f6]" />
                <Link href={`/jugadores/${player1.playerId}`} className="font-medium text-white hover:text-blue-400">
                  {normalizeName(player1.nombre)}
                </Link>
                <span className="text-xs text-gray-500">({normalizeName(player1.equipo)})</span>
              </span>
              <span className="text-gray-500">vs</span>
              <span className="flex items-center gap-2">
                <span className="inline-block w-3 h-3 rounded-full bg-[#f97316]" />
                <Link href={`/jugadores/${player2.playerId}`} className="font-medium text-white hover:text-orange-400">
                  {normalizeName(player2.nombre)}
                </Link>
                <span className="text-xs text-gray-500">({normalizeName(player2.equipo)})</span>
              </span>
            </div>
            <WhatsAppShare
              text={`Comparativa: ${normalizeName(player1.nombre)} vs ${normalizeName(player2.nombre)} — Temporada 2025 Liga Universitaria`}
              url={typeof window !== 'undefined' ? window.location.href : ''}
            />
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-[#1a2234] rounded-2xl p-6 border border-[#1e293b]">
              <h2 className="text-base font-semibold mb-6 text-gray-200">Estadísticas comparadas</h2>
              <ComparisonBarChart
                team1={normalizeName(player1.nombre)}
                team2={normalizeName(player2.nombre)}
                kpis={allKPIs}
              />
            </div>

            <div className="bg-[#1a2234] rounded-2xl p-6 border border-[#1e293b]">
              <h2 className="text-base font-semibold mb-2 text-gray-200">Perfil comparativo</h2>
              <p className="text-xs text-gray-500 mb-4">
                Valores normalizados entre los dos jugadores. Para Amarillas, menos es mejor.
              </p>
              <ComparisonRadarChart
                team1={normalizeName(player1.nombre)}
                team2={normalizeName(player2.nombre)}
                kpis={radarKPIs}
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
                    {normalizeName(player1.nombre)}
                  </th>
                  <th className="px-4 py-3 text-center font-medium" style={{ color: '#f97316' }}>
                    {normalizeName(player2.nombre)}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e293b]">
                {allKPIs.map((k) => {
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
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
