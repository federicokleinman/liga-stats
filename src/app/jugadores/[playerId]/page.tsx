'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import type { PlayerCache, PlayerSeason, PlayerMatchAppearance } from '@/lib/playerTypes';
import { temporadaToYear } from '@/lib/types';

function normalizeName(name: string) {
  return name
    .toLowerCase()
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function formatDate(iso: string) {
  if (!iso) return '-';
  const d = new Date(iso);
  return d.toLocaleDateString('es-UY', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function StatCard({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent?: string }) {
  return (
    <div className="bg-[#1a2234] rounded-xl border border-[#1e293b] p-4 text-center">
      <div className={`text-2xl font-bold ${accent || 'text-white'}`}>{value}</div>
      <div className="text-xs text-gray-400 mt-1">{label}</div>
      {sub && <div className="text-xs text-gray-500 mt-0.5">{sub}</div>}
    </div>
  );
}

function computeRecord(partidos: PlayerMatchAppearance[]) {
  let w = 0, d = 0, l = 0;
  for (const p of partidos) {
    const [gL, gV] = p.resultado.split('-').map(Number);
    const ge = p.esLocal ? gL : gV;
    const gr = p.esLocal ? gV : gL;
    if (ge > gr) w++;
    else if (ge === gr) d++;
    else l++;
  }
  return { w, d, l };
}

function computeGoalStreak(partidos: PlayerMatchAppearance[]) {
  const sorted = [...partidos].sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
  let best = 0, current = 0;
  for (const p of sorted) {
    if (p.goles > 0) { current++; if (current > best) best = current; }
    else current = 0;
  }
  return best;
}

function ShareButton({ player, year }: { player: PlayerSeason; year: number }) {
  function handleShare() {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    const name = normalizeName(player.nombre);
    const team = normalizeName(player.equipo);
    const lines = [
      `${name} (${team}) — ${year} Mayores Div A`,
      `${player.pj} PJ | ${player.minutos} min | ${player.goles} goles | ${player.amarillas} TA | ${player.rojas} TR`,
      '',
      url,
    ];
    window.open(`https://wa.me/?text=${encodeURIComponent(lines.join('\n'))}`, '_blank');
  }

  return (
    <button
      onClick={handleShare}
      title="Compartir en WhatsApp"
      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#25D366] hover:bg-[#20bd5a] text-white text-sm font-medium rounded-lg transition-colors"
    >
      <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" aria-hidden="true">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
      </svg>
      Compartir
    </button>
  );
}

export default function PlayerDetailPage({ params }: { params: { playerId: string } }) {
  const { playerId } = params;
  const [player, setPlayer] = useState<PlayerSeason | null>(null);
  const [year, setYear] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/players?temporada=112&divisional=A')
      .then((r) => {
        if (!r.ok) throw new Error('No disponible');
        return r.json();
      })
      .then((data: PlayerCache) => {
        const found = data.players.find((p) => p.playerId === playerId);
        if (!found) {
          setError('Jugador no encontrado');
        } else {
          setPlayer(found);
          setYear(temporadaToYear(data.temporadaId));
        }
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [playerId]);

  const stats = useMemo(() => {
    if (!player) return null;
    const record = computeRecord(player.partidos);
    const goalStreak = computeGoalStreak(player.partidos);
    const promMinutos = player.pj > 0 ? (player.minutos / player.pj).toFixed(0) : '0';
    const golesPorPJ = player.pj > 0 ? (player.goles / player.pj).toFixed(2) : '0.00';
    const winPct = player.pj > 0 ? ((record.w / player.pj) * 100).toFixed(0) : '0';
    return { record, goalStreak, promMinutos, golesPorPJ, winPct };
  }, [player]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error || !player || !stats) {
    return (
      <div className="text-center py-12 text-gray-400">
        <p>{error || 'Jugador no encontrado.'}</p>
        <Link href="/jugadores" className="text-blue-400 hover:underline mt-4 inline-block">
          Volver a Jugadores
        </Link>
      </div>
    );
  }

  const sortedPartidos = [...player.partidos].sort(
    (a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime(),
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <Link href="/jugadores" className="text-blue-400 hover:underline text-sm mb-2 inline-block">
            ← Jugadores
          </Link>
          <h1 className="text-3xl font-bold">{normalizeName(player.nombre)}</h1>
          <p className="text-gray-400 mt-1">
            {normalizeName(player.equipo)} — {year} Mayores Div A
          </p>
        </div>
        <ShareButton player={player} year={year} />
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        <StatCard label="Partidos" value={player.pj} sub={`${player.titular} TIT / ${player.suplente} SUP`} />
        <StatCard label="Minutos" value={player.minutos} sub={`${stats.promMinutos} prom/PJ`} />
        <StatCard label="Goles" value={player.goles} sub={`${stats.golesPorPJ}/PJ`} accent="text-green-400" />
        <StatCard
          label="Amarillas"
          value={player.amarillas}
          accent={player.amarillas > 0 ? 'text-yellow-400' : 'text-gray-500'}
        />
        <StatCard
          label="Rojas"
          value={player.rojas}
          accent={player.rojas > 0 ? 'text-red-400' : 'text-gray-500'}
        />
      </div>

      {/* Secondary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        <StatCard
          label="Récord"
          value={`${stats.record.w}G ${stats.record.d}E ${stats.record.l}P`}
          sub={`${stats.winPct}% victorias`}
        />
        <StatCard label="Min/Gol" value={player.goles > 0 ? Math.round(player.minutos / player.goles) : '-'} />
        {stats.goalStreak > 1 && (
          <StatCard label="Racha goleadora" value={stats.goalStreak} sub="partidos consecutivos" accent="text-green-400" />
        )}
        {player.golesEnContra > 0 && (
          <StatCard label="Goles en contra" value={player.golesEnContra} accent="text-orange-400" />
        )}
        <StatCard
          label="% Titular"
          value={player.pj > 0 ? `${((player.titular / player.pj) * 100).toFixed(0)}%` : '-'}
          sub={`${player.titular} de ${player.pj}`}
        />
      </div>

      {/* Match-by-match table */}
      <div className="bg-[#1a2234] rounded-2xl border border-[#1e293b] overflow-hidden">
        <h2 className="px-4 py-3 text-base font-semibold text-gray-200 border-b border-[#1e293b]">
          Detalle partido a partido
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#1e293b] text-gray-400">
                <th className="px-4 py-3 text-left">Fecha</th>
                <th className="px-4 py-3 text-left">Rival</th>
                <th className="px-4 py-3 text-center">Resultado</th>
                <th className="px-4 py-3 text-center">Tipo</th>
                <th className="px-4 py-3 text-center">Min</th>
                <th className="px-4 py-3 text-center">⚽</th>
                <th className="px-4 py-3 text-center">🟨</th>
                <th className="px-4 py-3 text-center">🟥</th>
              </tr>
            </thead>
            <tbody>
              {sortedPartidos.map((p, i) => {
                const [gLocal, gVisita] = p.resultado.split('-').map(Number);
                const golesEquipo = p.esLocal ? gLocal : gVisita;
                const golesRival = p.esLocal ? gVisita : gLocal;
                const isWin = golesEquipo > golesRival;
                const isDraw = golesEquipo === golesRival;
                const resultColor = isWin
                  ? 'text-green-400'
                  : isDraw
                    ? 'text-gray-400'
                    : 'text-red-400';

                return (
                  <tr
                    key={`${p.matchId}-${i}`}
                    className="border-b border-[#1e293b]/50 hover:bg-[#111827]/50 transition-colors"
                  >
                    <td className="px-4 py-2.5 text-gray-400 whitespace-nowrap">{formatDate(p.fecha)}</td>
                    <td className="px-4 py-2.5 text-white">
                      {p.esLocal ? 'vs ' : '@ '}
                      {normalizeName(p.rival)}
                    </td>
                    <td className={`px-4 py-2.5 text-center font-semibold ${resultColor}`}>
                      {golesEquipo}-{golesRival}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                          p.titular
                            ? 'bg-blue-600/20 text-blue-400'
                            : 'bg-gray-700/50 text-gray-400'
                        }`}
                      >
                        {p.titular ? 'TIT' : 'SUP'}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-center text-gray-300">{p.minutosJugados}&apos;</td>
                    <td className="px-4 py-2.5 text-center">
                      {p.goles > 0 ? (
                        <span className="text-green-400 font-semibold">{p.goles}</span>
                      ) : (
                        <span className="text-gray-600">-</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      {p.amarilla ? (
                        <span className="inline-block w-3 h-4 bg-yellow-400 rounded-sm" />
                      ) : (
                        <span className="text-gray-600">-</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      {p.roja ? (
                        <span className="inline-block w-3 h-4 bg-red-500 rounded-sm" />
                      ) : (
                        <span className="text-gray-600">-</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
