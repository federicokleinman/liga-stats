'use client';

import { Suspense } from 'react';
import { useMetrics, useTorneo } from '@/lib/hooks';
import { SortableTable, Column } from '@/components/SortableTable';
import { Card } from '@/components/Card';
import { IngestProgress } from '@/components/IngestProgress';
import { temporadaToYear } from '@/lib/types';
import Link from 'next/link';

function HistoricoContent() {
  const [torneo] = useTorneo();
  const { metrics, loading, error, progress } = useMetrics(torneo);

  if (progress && progress.status !== 'ready') {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <IngestProgress status={progress.status} message={progress.message} done={progress.done} total={progress.total} />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="animate-spin h-8 w-8 border-4 border-liga-blue border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error || !metrics) {
    return <div className="text-center text-red-400 py-12">{error || 'Error cargando datos.'}</div>;
  }

  const topChamp = metrics.topChampions[0];

  const champCols: Column<(typeof metrics.topChampions)[0] & { _rank: number }>[] = [
    { key: '_rank', label: '#', align: 'center', sortable: false },
    { key: 'nombre', label: 'Equipo', render: (row) => <Link href={`/equipos/${row.teamId}`} className="text-liga-sky hover:text-white hover:underline">{row.nombre}</Link> },
    { key: 'campeonatos', label: 'Campeonatos', align: 'right' },
  ];

  const streakCols: Column<(typeof metrics.championshipStreaks)[0] & { _rank: number }>[] = [
    { key: '_rank', label: '#', align: 'center', sortable: false },
    { key: 'nombre', label: 'Equipo', render: (row) => <Link href={`/equipos/${row.teamId}`} className="text-liga-sky hover:text-white hover:underline">{row.nombre}</Link> },
    { key: 'streak', label: 'Racha', align: 'right' },
    { key: 'divisional', label: 'Div.', align: 'center' },
    { key: 'fromTemporada', label: 'Período', render: (row) => <span>{temporadaToYear(row.fromTemporada)}–{temporadaToYear(row.toTemporada)}</span> },
  ];

  const consistencyCols: Column<(typeof metrics.consistency)[0] & { _rank: number }>[] = [
    { key: '_rank', label: '#', align: 'center', sortable: false },
    { key: 'nombre', label: 'Equipo', render: (row) => <Link href={`/equipos/${row.teamId}`} className="text-liga-sky hover:text-white hover:underline">{row.nombre}</Link> },
    { key: 'temporadas', label: 'Temporadas', align: 'right' },
    { key: 'promedioPuntos', label: 'Prom. Pts', align: 'right', render: (row) => <span>{row.promedioPuntos.toFixed(1)}</span> },
  ];

  return (
    <div className="space-y-12">
      <div>
        <h1 className="text-3xl font-bold">Archivo Histórico</h1>
        <p className="text-[#7b8ba3] mt-1">
          {metrics.allTemporadas.length} temporadas (2003–2025) — Mayores Masculino
        </p>
      </div>

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

      <div className="space-y-10">
        <div>
          <h3 className="text-xl font-bold mb-4">Top 10 — Máximo Ganador Histórico</h3>
          <SortableTable data={metrics.topChampions.map((r, i) => ({ ...r, _rank: i + 1 }))} columns={champCols} keyField="teamId" defaultSort="campeonatos" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <h3 className="text-xl font-bold mb-4">Racha de Campeonatos</h3>
            <SortableTable data={metrics.championshipStreaks.map((r, i) => ({ ...r, _rank: i + 1 }))} columns={streakCols} keyField="_rank" defaultSort="streak" />
          </div>
          <div>
            <h3 className="text-xl font-bold mb-4">Consistencia (Prom. Pts/Temporada)</h3>
            <SortableTable data={metrics.consistency.map((r, i) => ({ ...r, _rank: i + 1 }))} columns={consistencyCols} keyField="teamId" defaultSort="promedioPuntos" />
          </div>
        </div>
      </div>

      {/* Navigation cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link href="/historico/temporadas" className="bg-liga-card border border-liga-border rounded-xl p-6 hover:border-liga-blue/40 transition-colors group">
          <h3 className="font-semibold text-white group-hover:text-liga-sky transition-colors">Explorar por Temporada</h3>
          <p className="text-sm text-[#7b8ba3] mt-1">Tablas de posiciones de cada año y divisional</p>
        </Link>
        <Link href="/historico/equipos" className="bg-liga-card border border-liga-border rounded-xl p-6 hover:border-liga-blue/40 transition-colors group">
          <h3 className="font-semibold text-white group-hover:text-liga-sky transition-colors">Directorio de Equipos</h3>
          <p className="text-sm text-[#7b8ba3] mt-1">Todos los equipos con su historial</p>
        </Link>
        <Link href="/comparar" className="bg-liga-card border border-liga-border rounded-xl p-6 hover:border-liga-blue/40 transition-colors group">
          <h3 className="font-semibold text-white group-hover:text-liga-sky transition-colors">Comparar Equipos</h3>
          <p className="text-sm text-[#7b8ba3] mt-1">Comparativa histórica entre dos equipos</p>
        </Link>
      </div>
    </div>
  );
}

export default function HistoricoPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[40vh]"><div className="animate-spin h-8 w-8 border-4 border-liga-blue border-t-transparent rounded-full" /></div>}>
      <HistoricoContent />
    </Suspense>
  );
}
