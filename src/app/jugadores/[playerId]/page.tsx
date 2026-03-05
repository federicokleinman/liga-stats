'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import type { PlayerCache, PlayerSeason } from '@/lib/playerTypes';
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error || !player) {
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

  const promMinutos = player.pj > 0 ? (player.minutos / player.pj).toFixed(0) : '0';
  const golesPorPJ = player.pj > 0 ? (player.goles / player.pj).toFixed(2) : '0.00';

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
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <StatCard label="Partidos" value={player.pj} sub={`${player.titular} TIT / ${player.suplente} SUP`} />
        <StatCard label="Minutos" value={player.minutos} sub={`${promMinutos} prom/PJ`} />
        <StatCard label="Goles" value={player.goles} sub={`${golesPorPJ}/PJ`} accent="text-green-400" />
        {player.golesEnContra > 0 && (
          <StatCard label="En Contra" value={player.golesEnContra} accent="text-orange-400" />
        )}
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
        <StatCard label="Min/Gol" value={player.goles > 0 ? Math.round(player.minutos / player.goles) : '-'} />
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
