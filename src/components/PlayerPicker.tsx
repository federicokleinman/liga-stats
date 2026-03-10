'use client';

import { useState, useMemo } from 'react';
import type { PlayerSeason } from '@/lib/playerTypes';

function normalizeName(name: string) {
  return name
    .toLowerCase()
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export function PlayerPicker({
  label,
  value,
  onChange,
  players,
  exclude,
}: {
  label: string;
  value: string;
  onChange: (id: string) => void;
  players: PlayerSeason[];
  exclude?: string;
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);

  const selected = players.find((p) => p.playerId === value);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return players
      .filter(
        (p) =>
          p.playerId !== exclude &&
          (p.nombre.toLowerCase().includes(q) || p.equipo.toLowerCase().includes(q)),
      )
      .slice(0, 20);
  }, [players, query, exclude]);

  function pick(player: PlayerSeason) {
    onChange(player.playerId);
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
          {selected ? normalizeName(selected.nombre) : 'Elegir jugador\u2026'}
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
              placeholder="Buscar jugador\u2026"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full px-3 py-1.5 bg-[#0f172a] border border-[#334155] rounded text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
          </div>
          <ul className="max-h-52 overflow-y-auto divide-y divide-[#334155]">
            {filtered.length === 0 && (
              <li className="px-3 py-2 text-sm text-gray-500">Sin resultados</li>
            )}
            {filtered.map((p) => (
              <li key={p.playerId}>
                <button
                  onClick={() => pick(p)}
                  className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-[#334155] hover:text-white transition-colors"
                >
                  {normalizeName(p.nombre)}
                  <span className="ml-2 text-xs text-gray-500">{normalizeName(p.equipo)}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
