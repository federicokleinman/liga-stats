'use client';

import { Suspense } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { TeamComparison } from '@/components/TeamComparison';
import { PlayerComparison } from '@/components/PlayerComparison';

function CompararContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const tab = searchParams.get('tab') || 'equipos';

  function setTab(t: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', t);
    // Clear the other tab's params
    if (t === 'jugadores') { params.delete('equipo1'); params.delete('equipo2'); }
    if (t === 'equipos') { params.delete('jugador1'); params.delete('jugador2'); }
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Comparar</h1>
        <p className="text-gray-400 mt-1">
          {tab === 'equipos'
            ? 'Comparativa histórica de equipos — Mayores'
            : 'Comparativa de jugadores — Temporada 2025'}
        </p>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-2">
        <button
          onClick={() => setTab('equipos')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === 'equipos'
              ? 'bg-blue-600 text-white'
              : 'bg-[#1e293b] text-gray-300 hover:text-white hover:bg-gray-700'
          }`}
        >
          Equipos
        </button>
        <button
          onClick={() => setTab('jugadores')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === 'jugadores'
              ? 'bg-blue-600 text-white'
              : 'bg-[#1e293b] text-gray-300 hover:text-white hover:bg-gray-700'
          }`}
        >
          Jugadores
        </button>
      </div>

      {tab === 'equipos' && <TeamComparison />}
      {tab === 'jugadores' && <PlayerComparison />}
    </div>
  );
}

export default function CompararPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[40vh]">
          <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />
        </div>
      }
    >
      <CompararContent />
    </Suspense>
  );
}
