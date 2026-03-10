'use client';

import { Suspense, useState, useEffect } from 'react';
import { useMetrics, useTorneo, useStandings } from '@/lib/hooks';
import { Card } from '@/components/Card';
import { IngestProgress } from '@/components/IngestProgress';
import { SortableTable, Column } from '@/components/SortableTable';
import { WhatsAppShare } from '@/components/WhatsAppShare';
import { temporadaToYear } from '@/lib/types';
import type { StandingRow } from '@/lib/types';
import Link from 'next/link';

function HomeContent() {
  const [torneo] = useTorneo();
  const { metrics, loading, error, progress } = useMetrics(torneo);

  // Última temporada: derive latest temporada from metrics, then fetch standings
  const [latestTemp, setLatestTemp] = useState<number | null>(null);
  useEffect(() => {
    if (metrics?.allTemporadas.length) {
      setLatestTemp(Math.max(...metrics.allTemporadas));
    }
  }, [metrics]);
  const { rows: latestRows, loading: standingsLoading } = useStandings(latestTemp, 'A', torneo);

  if (progress && progress.status !== 'ready') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <IngestProgress
          status={progress.status}
          message={progress.message}
          done={progress.done}
          total={progress.total}
        />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin h-10 w-10 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-400">Cargando datos...</p>
        </div>
      </div>
    );
  }

  if (error || !metrics) {
    return (
      <div className="bg-[#111827] border border-yellow-600/30 rounded-xl p-8 text-center">
        <h2 className="text-xl font-bold text-yellow-400 mb-2">Error</h2>
        <p className="text-gray-400">{error || 'Error cargando datos. Intentá de nuevo en unos minutos.'}</p>
      </div>
    );
  }

  const topChamp = metrics.topChampions[0];

  // --- Column definitions ---

  const champCols: Column<(typeof metrics.topChampions)[0] & { _rank: number }>[] = [
    { key: '_rank', label: '#', align: 'center', sortable: false },
    { key: 'nombre', label: 'Equipo', render: (row) => <Link href={`/equipos/${row.teamId}`} className="text-blue-400 hover:text-blue-300 hover:underline">{row.nombre}</Link> },
    { key: 'campeonatos', label: 'Campeonatos', align: 'right' },
  ];

  const consistencyCols: Column<(typeof metrics.consistency)[0] & { _rank: number }>[] = [
    { key: '_rank', label: '#', align: 'center', sortable: false },
    { key: 'nombre', label: 'Equipo', render: (row) => <Link href={`/equipos/${row.teamId}`} className="text-blue-400 hover:text-blue-300 hover:underline">{row.nombre}</Link> },
    { key: 'temporadas', label: 'Temporadas', align: 'right' },
    { key: 'promedioPuntos', label: 'Prom. Pts', align: 'right', render: (row) => <span>{row.promedioPuntos.toFixed(1)}</span> },
  ];

  const streakCols: Column<(typeof metrics.championshipStreaks)[0] & { _rank: number }>[] = [
    { key: '_rank', label: '#', align: 'center', sortable: false },
    { key: 'nombre', label: 'Equipo', render: (row) => <Link href={`/equipos/${row.teamId}`} className="text-blue-400 hover:text-blue-300 hover:underline">{row.nombre}</Link> },
    { key: 'streak', label: 'Racha', align: 'right' },
    { key: 'divisional', label: 'Div.', align: 'center' },
    { key: 'fromTemporada', label: 'Período', render: (row) => <span>T{row.fromTemporada}–T{row.toTemporada}</span> },
  ];

  // Standings columns for Última Temporada
  const standingsCols: Column<StandingRow & { _rank: number }>[] = [
    { key: '_rank', label: '#', align: 'center', sortable: false },
    { key: 'equipoNombreNormalizado', label: 'Equipo', render: (row) => <Link href={`/equipos/${row.teamId}`} className="text-blue-400 hover:text-blue-300 hover:underline">{row.equipoNombreNormalizado}</Link> },
    { key: 'pj', label: 'PJ', align: 'center' },
    { key: 'pg', label: 'PG', align: 'center' },
    { key: 'pe', label: 'PE', align: 'center' },
    { key: 'pp', label: 'PP', align: 'center' },
    { key: 'gf', label: 'GF', align: 'center' },
    { key: 'gc', label: 'GC', align: 'center' },
    { key: 'diferencia', label: 'Dif', align: 'center', render: (row) => <span className={row.diferencia > 0 ? 'text-green-400' : row.diferencia < 0 ? 'text-red-400' : ''}>{row.diferencia > 0 ? '+' : ''}{row.diferencia}</span> },
    { key: 'puntos', label: 'Pts', align: 'center', render: (row) => <span className="font-bold">{row.puntos}</span> },
  ];

  const latestYear = latestTemp ? temporadaToYear(latestTemp) : null;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold">Inicio</h1>
          <p className="text-gray-400 mt-1">Liga Universitaria — Fútbol Mayores</p>
        </div>
        <WhatsAppShare text="Mirá las estadísticas históricas de Mayores en la Liga Universitaria" />
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card title="Equipos" value={metrics.allTeams.length} icon="👥" />
        <Card title="Temporadas" value={metrics.allTemporadas.length} icon="📅" />
        <Card title="Divisionales" value={metrics.divisionales.join(', ')} icon="🏆" />
        <Card
          title="Máximo Ganador"
          value={topChamp ? topChamp.nombre : 'N/A'}
          subtitle={topChamp ? `${topChamp.campeonatos} campeonatos` : ''}
          icon="🥇"
        />
      </div>

      {/* === ÚLTIMA TEMPORADA === */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">Última Temporada {latestYear ? `(${latestYear})` : ''} — Divisional A</h2>
          <Link
            href="/temporadas"
            className="text-blue-400 hover:text-blue-300 text-sm hover:underline"
          >
            Ver todas las divisionales →
          </Link>
        </div>
        {standingsLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />
          </div>
        ) : latestRows.length > 0 ? (
          <SortableTable
            data={latestRows.map((r, i) => ({ ...r, _rank: i + 1 }))}
            columns={standingsCols}
            keyField="teamId"
            defaultSort="puntos"
          />
        ) : (
          <p className="text-gray-500 text-center py-8">No hay datos disponibles para la última temporada.</p>
        )}
      </section>

      {/* === HISTÓRICOS === */}
      <section>
        <h2 className="text-2xl font-bold mb-6">Históricos</h2>

        <div className="space-y-8">
          <div>
            <h3 className="text-xl font-bold mb-4">🏆 Top 10 — Máximo Ganador Histórico</h3>
            <SortableTable data={metrics.topChampions.map((r, i) => ({ ...r, _rank: i + 1 }))} columns={champCols} keyField="teamId" defaultSort="campeonatos" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div>
              <h3 className="text-xl font-bold mb-4">⚡ Racha de Campeonatos</h3>
              <SortableTable data={metrics.championshipStreaks.map((r, i) => ({ ...r, _rank: i + 1 }))} columns={streakCols} keyField="_rank" defaultSort="streak" />
            </div>
            <div>
              <h3 className="text-xl font-bold mb-4">📊 Consistencia (Prom. Pts/Temporada)</h3>
              <SortableTable data={metrics.consistency.map((r, i) => ({ ...r, _rank: i + 1 }))} columns={consistencyCols} keyField="teamId" defaultSort="promedioPuntos" />
            </div>
          </div>
        </div>
      </section>

      {/* Hidden metrics — kept for future use:
      - Mejores Temporadas por Puntos (bestSeasons)
      - Mejor Ataque GF/PJ (bestAttack)
      - Mejor Defensa GC/PJ (bestDefense)
      - Rachas de Ascenso (promotionStreaks)
      */}
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[60vh]"><div className="animate-spin h-10 w-10 border-4 border-blue-500 border-t-transparent rounded-full" /></div>}>
      <HomeContent />
    </Suspense>
  );
}
