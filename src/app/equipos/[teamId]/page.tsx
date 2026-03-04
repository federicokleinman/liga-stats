'use client';

import { useTeam } from '@/lib/hooks';
import { Card } from '@/components/Card';
import { SortableTable, Column } from '@/components/SortableTable';
import { TrajectoryChart } from '@/components/TrajectoryChart';
import { WhatsAppShare } from '@/components/WhatsAppShare';
import Link from 'next/link';

interface HistoryRow {
  temporadaId: number;
  divisional: string;
  posicion: number;
  puntos: number;
  [key: string]: unknown;
}

export default function TeamDetailPage({ params }: { params: { teamId: string } }) {
  const { teamId } = params;
  const { team, loading, error } = useTeam(teamId);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error || !team) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400">{error || 'Equipo no encontrado.'}</p>
        <Link href="/equipos" className="text-blue-400 hover:underline mt-4 inline-block">
          ← Volver a Equipos
        </Link>
      </div>
    );
  }

  const historyCols: Column<HistoryRow>[] = [
    { key: 'temporadaId', label: 'Temporada', align: 'center' },
    { key: 'divisional', label: 'Divisional', align: 'center' },
    { key: 'posicion', label: 'Posición', align: 'center' },
    { key: 'puntos', label: 'Puntos', align: 'right' },
  ];

  const gfpj = team.totalPJ > 0 ? (team.totalGF / team.totalPJ).toFixed(2) : 'N/A';
  const gcpj = team.totalPJ > 0 ? (team.totalGC / team.totalPJ).toFixed(2) : 'N/A';

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Link href="/equipos" className="text-gray-400 hover:text-white transition-colors">
          ← Equipos
        </Link>
      </div>

      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold">{team.nombre}</h1>
          <p className="text-gray-400 mt-1">{team.temporadas} temporadas en la Liga</p>
        </div>
        <WhatsAppShare text={`Mirá las estadísticas de ${team.nombre} en la Liga Universitaria`} />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card title="Campeonatos" value={team.campeonatos} icon="🏆" />
        <Card title="Temporadas" value={team.temporadas} icon="📅" />
        <Card title="Mejor Posición" value={`#${team.mejorPosicion}`} icon="🥇" />
        <Card title="Prom. Pts" value={team.promedioPuntos.toFixed(1)} icon="📊" />
        <Card title="GF/PJ" value={gfpj} icon="⚽" />
        <Card title="GC/PJ" value={gcpj} icon="🛡️" />
      </div>

      <section>
        <h2 className="text-xl font-bold mb-4">Trayectoria</h2>
        <TrajectoryChart data={team.divisionalHistory} />
      </section>

      <section>
        <h2 className="text-xl font-bold mb-4">Historial por Temporada</h2>
        <SortableTable
          data={team.divisionalHistory as HistoryRow[]}
          columns={historyCols}
          keyField="temporadaId"
          defaultSort="temporadaId"
          defaultDir="desc"
        />
      </section>

      <div className="text-center pt-4 border-t border-[#1e293b]">
        <p className="text-gray-500 text-sm">
          Ves algo incorrecto?{' '}
          <Link href="/contacto" className="text-blue-400 hover:underline">
            Reportar un error
          </Link>
        </p>
      </div>
    </div>
  );
}
