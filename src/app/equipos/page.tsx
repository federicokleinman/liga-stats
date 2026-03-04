'use client';

import { Suspense, useState, useMemo } from 'react';
import { useMetrics, useTorneo } from '@/lib/hooks';
import { TorneoSelector } from '@/components/TorneoSelector';
import Link from 'next/link';

function EquiposContent() {
  const [torneo, ] = useTorneo();
  const { metrics, loading, error, progress } = useMetrics(torneo);
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!metrics) return [];
    const q = search.toLowerCase().trim();
    return metrics.allTeams.filter((t) => t.nombre.toLowerCase().includes(q));
  }, [metrics, search]);

  if (loading) {
    return <div className="flex items-center justify-center min-h-[40vh]"><div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" /></div>;
  }

  if (progress && progress.status !== 'ready') {
    return (
      <div className="text-center py-12 text-gray-400">
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
        <p>Cargando datos... {progress.total > 0 ? `${Math.round((progress.done / progress.total) * 100)}%` : ''}</p>
      </div>
    );
  }

  if (error || !metrics) {
    return <div className="text-center py-12 text-gray-400"><p>{error || 'Error cargando datos.'}</p></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Equipos</h1>
        <p className="text-gray-400 mt-1">{metrics.allTeams.length} equipos registrados</p>
      </div>

      <TorneoSelector />

      <div className="relative">
        <input
          type="text"
          placeholder="Buscar equipo..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-4 py-3 bg-[#111827] border border-[#1e293b] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
        />
        <svg className="absolute right-3 top-3.5 h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {filtered.map((team) => {
          const summary = metrics.teamSummaries[team.teamId];
          return (
            <Link
              key={team.teamId}
              href={`/equipos/${team.teamId}?torneo=${encodeURIComponent(torneo)}`}
              className="bg-[#111827] border border-[#1e293b] rounded-lg p-4 hover:border-blue-500/40 transition-colors group"
            >
              <h3 className="font-semibold text-white group-hover:text-blue-400 transition-colors">{team.nombre}</h3>
              {summary && (
                <div className="flex gap-4 mt-2 text-sm text-gray-400">
                  <span>{summary.temporadas} temp.</span>
                  {summary.campeonatos > 0 && <span className="text-yellow-400">🏆 {summary.campeonatos}</span>}
                  <span>Prom: {summary.promedioPuntos.toFixed(1)} pts</span>
                </div>
              )}
            </Link>
          );
        })}
      </div>

      {filtered.length === 0 && <p className="text-center text-gray-500 py-8">No se encontraron equipos.</p>}
    </div>
  );
}

export default function EquiposPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[40vh]"><div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" /></div>}>
      <EquiposContent />
    </Suspense>
  );
}
