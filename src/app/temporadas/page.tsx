'use client';

import { useState } from 'react';
import { useMetrics, useStandings } from '@/lib/hooks';
import { SortableTable, Column } from '@/components/SortableTable';
import { WhatsAppShare } from '@/components/WhatsAppShare';
import type { StandingRow } from '@/lib/types';
import Link from 'next/link';

export default function TemporadasPage() {
  const { metrics, loading: metricsLoading, progress } = useMetrics();
  const [selectedTemp, setSelectedTemp] = useState<number | null>(null);
  const [selectedDiv, setSelectedDiv] = useState<string | null>(null);
  const { rows, loading: standingsLoading } = useStandings(selectedTemp, selectedDiv);

  if (metricsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (progress && progress.status !== 'ready') {
    return (
      <div className="text-center py-12 text-gray-400">
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
        <p>Cargando datos... {progress.total > 0 ? `${Math.round((progress.done / progress.total) * 100)}%` : ''}</p>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="text-center py-12 text-gray-400">
        Error cargando datos.
      </div>
    );
  }

  const divs = metrics.divisionales;
  const temps = metrics.allTemporadas;

  const standingsCols: Column<StandingRow & { _key: string }>[] = [
    { key: 'posicion', label: '#', align: 'center' },
    {
      key: 'equipoNombreNormalizado',
      label: 'Equipo',
      render: (row) => (
        <Link href={`/equipos/${row.teamId}`} className="text-blue-400 hover:text-blue-300 hover:underline">
          {row.equipoNombreNormalizado}
        </Link>
      ),
    },
    { key: 'pj', label: 'PJ', align: 'right' },
    { key: 'pg', label: 'PG', align: 'right' },
    { key: 'pe', label: 'PE', align: 'right' },
    { key: 'pp', label: 'PP', align: 'right' },
    { key: 'gf', label: 'GF', align: 'right' },
    { key: 'gc', label: 'GC', align: 'right' },
    { key: 'diferencia', label: 'Dif', align: 'right' },
    { key: 'puntos', label: 'Pts', align: 'right', className: 'font-bold' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold">Temporadas</h1>
          <p className="text-gray-400 mt-1">Tablas de posiciones por temporada y divisional</p>
        </div>
        <WhatsAppShare text="Mirá las tablas de posiciones históricas de la Liga Universitaria" />
      </div>

      <div className="flex flex-wrap gap-4">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-sm font-medium text-gray-400 mb-1">Temporada</label>
          <select
            value={selectedTemp ?? ''}
            onChange={(e) => {
              setSelectedTemp(e.target.value ? parseInt(e.target.value) : null);
              setSelectedDiv(null);
            }}
            className="w-full px-3 py-2 bg-[#111827] border border-[#1e293b] rounded-lg text-white focus:outline-none focus:border-blue-500"
          >
            <option value="">Seleccionar temporada...</option>
            {temps.map((t) => (
              <option key={t} value={t}>
                Temporada {t}
              </option>
            ))}
          </select>
        </div>
      </div>

      {selectedTemp && (
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setSelectedDiv(null)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedDiv === null ? 'bg-blue-600 text-white' : 'bg-[#1e293b] text-gray-300 hover:text-white'
            }`}
          >
            Todas
          </button>
          {divs.map((d) => (
            <button
              key={d}
              onClick={() => setSelectedDiv(d)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedDiv === d ? 'bg-blue-600 text-white' : 'bg-[#1e293b] text-gray-300 hover:text-white'
              }`}
            >
              Div. {d}
            </button>
          ))}
        </div>
      )}

      {selectedTemp && (
        <div>
          {standingsLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />
            </div>
          ) : rows.length === 0 ? (
            <p className="text-center text-gray-500 py-8">
              No hay datos para Temporada {selectedTemp}
              {selectedDiv ? ` — Divisional ${selectedDiv}` : ''}.
            </p>
          ) : selectedDiv ? (
            <section>
              <h2 className="text-lg font-bold mb-3">
                Temporada {selectedTemp} — Divisional &quot;{selectedDiv}&quot;
              </h2>
              <SortableTable
                data={rows.map((r) => ({ ...r, _key: `${r.teamId}-${r.divisionalLetra}` }))}
                columns={standingsCols}
                keyField="_key"
                defaultSort="posicion"
                defaultDir="asc"
              />
            </section>
          ) : (
            divs.map((d) => {
              const divRows = rows.filter((r) => r.divisionalLetra === d);
              if (divRows.length === 0) return null;
              return (
                <section key={d} className="mb-8">
                  <h2 className="text-lg font-bold mb-3">Divisional &quot;{d}&quot;</h2>
                  <SortableTable
                    data={divRows.map((r) => ({ ...r, _key: `${r.teamId}-${r.divisionalLetra}` }))}
                    columns={standingsCols}
                    keyField="_key"
                    defaultSort="posicion"
                    defaultDir="asc"
                  />
                </section>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
