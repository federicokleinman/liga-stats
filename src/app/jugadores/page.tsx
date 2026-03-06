'use client';

import { Suspense, useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import type { PlayerCache } from '@/lib/playerTypes';
import { temporadaToYear } from '@/lib/types';

type SortKey = 'goles' | 'amarillas' | 'rojas' | 'minutos' | 'pj' | 'nombre';
type SortDir = 'asc' | 'desc';

const TABS: { key: SortKey; label: string; icon: string }[] = [
  { key: 'goles', label: 'Goleadores', icon: '⚽' },
  { key: 'minutos', label: 'Más Minutos', icon: '⏱' },
  { key: 'pj', label: 'Más Partidos', icon: '📋' },
  { key: 'amarillas', label: 'Amonestados', icon: '🟨' },
  { key: 'rojas', label: 'Expulsados', icon: '🟥' },
];

function normalizeName(name: string) {
  return name
    .toLowerCase()
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function JugadoresContent() {
  const [data, setData] = useState<PlayerCache | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<SortKey>('goles');
  const [sortKey, setSortKey] = useState<SortKey>('goles');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [divisionals, setDivisionals] = useState<string[]>([]);
  const [selectedDiv, setSelectedDiv] = useState('TODAS');
  const [torneos, setTorneos] = useState<string[]>([]);
  const [selectedTorneo, setSelectedTorneo] = useState('Mayores Masculino');

  const fetchPlayers = useCallback((div: string, torneo: string) => {
    setLoading(true);
    setError(null);
    fetch(`/api/players?temporada=112&divisional=${div}&torneo=${encodeURIComponent(torneo)}`)
      .then((r) => {
        if (!r.ok) throw new Error('No disponible');
        return r.json();
      })
      .then((d: PlayerCache) => setData(d))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const fetchDivisionals = useCallback((torneo: string) => {
    fetch(`/api/players/divisionals?temporada=112&torneo=${encodeURIComponent(torneo)}`)
      .then((r) => r.json())
      .then((d: { divisionals: string[]; torneos: string[] }) => {
        if (d.divisionals.length > 0) setDivisionals(d.divisionals);
        if (d.torneos.length > 0) setTorneos(d.torneos);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchDivisionals(selectedTorneo);
    fetchPlayers('TODAS', selectedTorneo);
  }, [fetchDivisionals, fetchPlayers, selectedTorneo]);

  const handleTorneoChange = (torneo: string) => {
    setSelectedTorneo(torneo);
    setSelectedDiv('TODAS');
    setDivisionals([]);
  };

  const handleDivChange = (div: string) => {
    setSelectedDiv(div);
    fetchPlayers(div, selectedTorneo);
  };

  const handleTabChange = (key: SortKey) => {
    setActiveTab(key);
    setSortKey(key);
    setSortDir('desc');
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortKey(key);
      setSortDir(key === 'nombre' ? 'asc' : 'desc');
    }
  };

  const filtered = useMemo(() => {
    if (!data) return [];
    let players = data.players;
    if (search.trim()) {
      const q = search.toLowerCase();
      players = players.filter(
        (p) =>
          p.nombre.toLowerCase().includes(q) ||
          p.equipo.toLowerCase().includes(q),
      );
    }
    // For specific tabs, pre-filter to only show players with relevant data
    if (activeTab === 'goles') players = players.filter((p) => p.goles > 0 || search.trim());
    if (activeTab === 'amarillas') players = players.filter((p) => p.amarillas > 0 || search.trim());
    if (activeTab === 'rojas') players = players.filter((p) => p.rojas > 0 || search.trim());

    return [...players].sort((a, b) => {
      const va = a[sortKey] as number | string;
      const vb = b[sortKey] as number | string;
      if (typeof va === 'string' && typeof vb === 'string') {
        return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
      }
      return sortDir === 'desc' ? (vb as number) - (va as number) : (va as number) - (vb as number);
    });
  }, [data, search, sortKey, sortDir, activeTab]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-center py-12 text-gray-400">
        <p>{error || 'Error cargando datos de jugadores.'}</p>
      </div>
    );
  }

  const SortIcon = ({ k }: { k: SortKey }) => {
    if (sortKey !== k) return <span className="text-gray-600 ml-1">↕</span>;
    return <span className="text-blue-400 ml-1">{sortDir === 'desc' ? '↓' : '↑'}</span>;
  };

  const selectClass =
    'bg-[#111827] border border-[#1e293b] rounded-lg text-white text-sm px-3 py-2 pr-8 focus:outline-none focus:border-blue-500 transition-colors appearance-none cursor-pointer';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Jugadores</h1>
          <p className="text-gray-400 mt-1">
            {data.players.length} jugadores — {temporadaToYear(data.temporadaId)} {selectedTorneo}
            {selectedDiv === 'TODAS' ? '' : ` Div ${data.divisional}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {torneos.length > 1 && (
            <div className="relative">
              <select
                value={selectedTorneo}
                onChange={(e) => handleTorneoChange(e.target.value)}
                className={selectClass}
              >
                {torneos.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2 text-gray-400">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </div>
            </div>
          )}
          {divisionals.length > 0 && (
            <div className="relative">
              <select
                value={selectedDiv}
                onChange={(e) => handleDivChange(e.target.value)}
                className={selectClass}
              >
                <option value="TODAS">Todas las divisionales</option>
                {divisionals.map((div) => (
                  <option key={div} value={div}>Divisional {div}</option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2 text-gray-400">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <input
          type="text"
          placeholder="Buscar jugador o equipo..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-4 py-3 bg-[#111827] border border-[#1e293b] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
        />
        <svg
          className="absolute right-3 top-3.5 h-5 w-5 text-gray-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => handleTabChange(tab.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-blue-600 text-white'
                : 'bg-[#111827] text-gray-300 hover:text-white hover:bg-gray-700 border border-[#1e293b]'
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-[#1a2234] rounded-2xl border border-[#1e293b] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#1e293b] text-gray-400">
                <th className="px-4 py-3 text-left w-8">#</th>
                <th
                  className="px-4 py-3 text-left cursor-pointer hover:text-white transition-colors"
                  onClick={() => handleSort('nombre')}
                >
                  Jugador <SortIcon k="nombre" />
                </th>
                <th className="px-4 py-3 text-left">Equipo</th>
                <th
                  className="px-4 py-3 text-center cursor-pointer hover:text-white transition-colors"
                  onClick={() => handleSort('pj')}
                >
                  PJ <SortIcon k="pj" />
                </th>
                <th className="px-4 py-3 text-center hidden sm:table-cell">TIT</th>
                <th className="px-4 py-3 text-center hidden sm:table-cell">SUP</th>
                <th
                  className="px-4 py-3 text-center cursor-pointer hover:text-white transition-colors"
                  onClick={() => handleSort('minutos')}
                >
                  Min <SortIcon k="minutos" />
                </th>
                <th
                  className="px-4 py-3 text-center cursor-pointer hover:text-white transition-colors"
                  onClick={() => handleSort('goles')}
                >
                  ⚽ <SortIcon k="goles" />
                </th>
                <th
                  className="px-4 py-3 text-center cursor-pointer hover:text-white transition-colors"
                  onClick={() => handleSort('amarillas')}
                >
                  🟨 <SortIcon k="amarillas" />
                </th>
                <th
                  className="px-4 py-3 text-center cursor-pointer hover:text-white transition-colors"
                  onClick={() => handleSort('rojas')}
                >
                  🟥 <SortIcon k="rojas" />
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 100).map((player, i) => (
                <tr
                  key={player.playerId}
                  className="border-b border-[#1e293b]/50 hover:bg-[#111827]/50 transition-colors"
                >
                  <td className="px-4 py-3 text-gray-500">{i + 1}</td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/jugadores/${player.playerId}${selectedTorneo !== 'Mayores Masculino' ? `?torneo=${encodeURIComponent(selectedTorneo)}` : ''}`}
                      className="text-white hover:text-blue-400 font-medium transition-colors"
                    >
                      {normalizeName(player.nombre)}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-400">{normalizeName(player.equipo)}</td>
                  <td className="px-4 py-3 text-center text-gray-300">{player.pj}</td>
                  <td className="px-4 py-3 text-center text-gray-400 hidden sm:table-cell">{player.titular}</td>
                  <td className="px-4 py-3 text-center text-gray-400 hidden sm:table-cell">{player.suplente}</td>
                  <td className="px-4 py-3 text-center text-gray-300">{player.minutos}</td>
                  <td className="px-4 py-3 text-center font-semibold text-white">
                    {player.goles > 0 ? player.goles : '-'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {player.amarillas > 0 ? (
                      <span className="text-yellow-400 font-semibold">{player.amarillas}</span>
                    ) : (
                      <span className="text-gray-600">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {player.rojas > 0 ? (
                      <span className="text-red-400 font-semibold">{player.rojas}</span>
                    ) : (
                      <span className="text-gray-600">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length > 100 && (
          <div className="px-4 py-3 text-center text-gray-500 text-sm border-t border-[#1e293b]">
            Mostrando 100 de {filtered.length} jugadores. Usá el buscador para filtrar.
          </div>
        )}
        {filtered.length === 0 && (
          <div className="px-4 py-8 text-center text-gray-500">No se encontraron jugadores.</div>
        )}
      </div>
    </div>
  );
}

export default function JugadoresPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[40vh]">
          <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />
        </div>
      }
    >
      <JugadoresContent />
    </Suspense>
  );
}
