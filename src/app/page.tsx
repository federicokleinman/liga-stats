'use client';

import { Suspense } from 'react';
import { useMetrics, useTorneo } from '@/lib/hooks';
import { Card } from '@/components/Card';
import { IngestProgress } from '@/components/IngestProgress';
import { SortableTable, Column } from '@/components/SortableTable';
import { WhatsAppShare } from '@/components/WhatsAppShare';
import { TorneoSelector } from '@/components/TorneoSelector';
import { TORNEO_DISPLAY, temporadaToYear } from '@/lib/types';
import Link from 'next/link';

function HomeContent() {
  const [torneo] = useTorneo();
  const { metrics, loading, error, progress } = useMetrics(torneo);

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
  const champCols: Column<(typeof metrics.topChampions)[0] & { _rank: number }>[] = [
    { key: '_rank', label: '#', align: 'center', sortable: false },
    { key: 'nombre', label: 'Equipo', render: (row) => <Link href={`/equipos/${row.teamId}?torneo=${encodeURIComponent(torneo)}`} className="text-blue-400 hover:text-blue-300 hover:underline">{row.nombre}</Link> },
    { key: 'campeonatos', label: 'Campeonatos', align: 'right' },
  ];

  const bestSeasonCols: Column<(typeof metrics.bestSeasons)[0] & { _rank: number }>[] = [
    { key: '_rank', label: '#', align: 'center', sortable: false },
    { key: 'nombre', label: 'Equipo', render: (row) => <Link href={`/equipos/${row.teamId}?torneo=${encodeURIComponent(torneo)}`} className="text-blue-400 hover:text-blue-300 hover:underline">{row.nombre}</Link> },
    { key: 'temporadaId', label: 'Año', align: 'center', render: (row) => <span>{temporadaToYear(row.temporadaId)}</span> },
    { key: 'divisional', label: 'Div.', align: 'center' },
    { key: 'puntos', label: 'Pts', align: 'right' },
    { key: 'pj', label: 'PJ', align: 'right' },
    { key: 'pg', label: 'PG', align: 'right' },
  ];

  const consistencyCols: Column<(typeof metrics.consistency)[0] & { _rank: number }>[] = [
    { key: '_rank', label: '#', align: 'center', sortable: false },
    { key: 'nombre', label: 'Equipo', render: (row) => <Link href={`/equipos/${row.teamId}?torneo=${encodeURIComponent(torneo)}`} className="text-blue-400 hover:text-blue-300 hover:underline">{row.nombre}</Link> },
    { key: 'temporadas', label: 'Temporadas', align: 'right' },
    { key: 'promedioPuntos', label: 'Prom. Pts', align: 'right', render: (row) => <span>{row.promedioPuntos.toFixed(1)}</span> },
  ];

  const attackCols: Column<(typeof metrics.bestAttack)[0] & { _rank: number }>[] = [
    { key: '_rank', label: '#', align: 'center', sortable: false },
    { key: 'nombre', label: 'Equipo', render: (row) => <Link href={`/equipos/${row.teamId}?torneo=${encodeURIComponent(torneo)}`} className="text-blue-400 hover:text-blue-300 hover:underline">{row.nombre}</Link> },
    { key: 'temporadaId', label: 'Año', align: 'center', render: (row) => <span>{temporadaToYear(row.temporadaId)}</span> },
    { key: 'divisional', label: 'Div.', align: 'center' },
    { key: 'value', label: 'GF/PJ', align: 'right', render: (row) => <span>{row.value.toFixed(2)}</span> },
    { key: 'gf', label: 'GF', align: 'right' },
    { key: 'pj', label: 'PJ', align: 'right' },
  ];

  const defenseCols: Column<(typeof metrics.bestDefense)[0] & { _rank: number }>[] = [
    { key: '_rank', label: '#', align: 'center', sortable: false },
    { key: 'nombre', label: 'Equipo', render: (row) => <Link href={`/equipos/${row.teamId}?torneo=${encodeURIComponent(torneo)}`} className="text-blue-400 hover:text-blue-300 hover:underline">{row.nombre}</Link> },
    { key: 'temporadaId', label: 'Año', align: 'center', render: (row) => <span>{temporadaToYear(row.temporadaId)}</span> },
    { key: 'divisional', label: 'Div.', align: 'center' },
    { key: 'value', label: 'GC/PJ', align: 'right', render: (row) => <span>{row.value.toFixed(2)}</span> },
    { key: 'gc', label: 'GC', align: 'right' },
    { key: 'pj', label: 'PJ', align: 'right' },
  ];

  const streakCols: Column<(typeof metrics.championshipStreaks)[0] & { _rank: number }>[] = [
    { key: '_rank', label: '#', align: 'center', sortable: false },
    { key: 'nombre', label: 'Equipo', render: (row) => <Link href={`/equipos/${row.teamId}?torneo=${encodeURIComponent(torneo)}`} className="text-blue-400 hover:text-blue-300 hover:underline">{row.nombre}</Link> },
    { key: 'streak', label: 'Racha', align: 'right' },
    { key: 'divisional', label: 'Div.', align: 'center' },
    { key: 'fromTemporada', label: 'Período', render: (row) => <span>T{row.fromTemporada}–T{row.toTemporada}</span> },
  ];

  const promoCols: Column<(typeof metrics.promotionStreaks)[0] & { _rank: number }>[] = [
    { key: '_rank', label: '#', align: 'center', sortable: false },
    { key: 'nombre', label: 'Equipo', render: (row) => <Link href={`/equipos/${row.teamId}?torneo=${encodeURIComponent(torneo)}`} className="text-blue-400 hover:text-blue-300 hover:underline">{row.nombre}</Link> },
    { key: 'streak', label: 'Ascensos', align: 'right' },
    { key: 'path', label: 'Trayecto', render: (row) => <span className="text-gray-400">{row.path.join(' → ')}</span> },
    { key: 'fromTemporada', label: 'Período', render: (row) => <span>T{row.fromTemporada}–T{row.toTemporada}</span> },
  ];

  const displayName = TORNEO_DISPLAY[torneo] ?? torneo;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold">Inicio</h1>
          <p className="text-gray-400 mt-1">Liga Universitaria — Fútbol {displayName}</p>
        </div>
        <WhatsAppShare text={`Mirá las estadísticas históricas de ${displayName} en la Liga Universitaria`} />
      </div>

      <TorneoSelector />

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

      <section>
        <h2 className="text-xl font-bold mb-4">🏆 Top 10 — Máximo Ganador Histórico</h2>
        <SortableTable data={metrics.topChampions.map((r, i) => ({ ...r, _rank: i + 1 }))} columns={champCols} keyField="teamId" defaultSort="campeonatos" />
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <section>
          <h2 className="text-xl font-bold mb-4">⚡ Racha de Campeonatos</h2>
          <SortableTable data={metrics.championshipStreaks.map((r, i) => ({ ...r, _rank: i + 1 }))} columns={streakCols} keyField="_rank" defaultSort="streak" />
        </section>
        <section>
          <h2 className="text-xl font-bold mb-4">📈 Mejores Temporadas por Puntos</h2>
          <SortableTable data={metrics.bestSeasons.map((r, i) => ({ ...r, _rank: i + 1 }))} columns={bestSeasonCols} keyField="_rank" defaultSort="puntos" />
        </section>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <section>
          <h2 className="text-xl font-bold mb-4">⚽ Mejor Ataque (GF/PJ)</h2>
          <SortableTable data={metrics.bestAttack.map((r, i) => ({ ...r, _rank: i + 1 }))} columns={attackCols} keyField="_rank" defaultSort="value" />
        </section>
        <section>
          <h2 className="text-xl font-bold mb-4">🛡️ Mejor Defensa (GC/PJ)</h2>
          <SortableTable data={metrics.bestDefense.map((r, i) => ({ ...r, _rank: i + 1 }))} columns={defenseCols} keyField="_rank" defaultSort="value" defaultDir="asc" />
        </section>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <section>
          <h2 className="text-xl font-bold mb-4">📊 Consistencia (Prom. Pts/Temporada)</h2>
          <SortableTable data={metrics.consistency.map((r, i) => ({ ...r, _rank: i + 1 }))} columns={consistencyCols} keyField="teamId" defaultSort="promedioPuntos" />
        </section>
        <section>
          <h2 className="text-xl font-bold mb-4">🚀 Rachas de Ascenso</h2>
          <SortableTable data={metrics.promotionStreaks.map((r, i) => ({ ...r, _rank: i + 1 }))} columns={promoCols} keyField="_rank" defaultSort="streak" />
        </section>
      </div>
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
