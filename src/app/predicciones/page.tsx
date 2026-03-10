'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePredictions } from '@/lib/hooks';
import { SortableTable, Column } from '@/components/SortableTable';
import { PredictionChart } from '@/components/PredictionChart';
import type { PredictionResult } from '@/lib/types';

type Row = PredictionResult & Record<string, unknown>;

const DIVISIONALS = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];

function pct(v: number): string {
  const p = Math.round(v * 100);
  return p < 1 && v > 0 ? '<1%' : `${p}%`;
}

function pctColor(v: number, type: 'champion' | 'top4' | 'bottom4'): string {
  if (v === 0) return 'text-gray-500';
  if (type === 'champion') {
    if (v >= 0.2) return 'text-yellow-300 font-bold';
    if (v >= 0.1) return 'text-yellow-400';
    return 'text-yellow-500/70';
  }
  if (type === 'top4') {
    if (v >= 0.5) return 'text-green-300 font-bold';
    if (v >= 0.25) return 'text-green-400';
    return 'text-green-500/70';
  }
  // bottom4
  if (v >= 0.5) return 'text-red-300 font-bold';
  if (v >= 0.25) return 'text-red-400';
  return 'text-red-500/70';
}

function originBadge(origin: PredictionResult['origin']) {
  if (origin === 'promoted') {
    return (
      <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-green-900/50 text-green-400 font-medium">
        ASCENDIDO
      </span>
    );
  }
  if (origin === 'relegated') {
    return (
      <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-red-900/50 text-red-400 font-medium">
        DESCENDIDO
      </span>
    );
  }
  return null;
}

const columns: Column<Row>[] = [
  {
    key: 'avgPosition',
    label: '#',
    align: 'center',
    sortable: true,
    render: (row) => {
      const pos = Math.round(row.avgPosition);
      return <span className="text-gray-400 font-mono">{pos}</span>;
    },
  },
  {
    key: 'nombre',
    label: 'Equipo',
    align: 'left',
    sortable: true,
    render: (row) => (
      <Link href={`/equipos/${row.teamId}`} className="hover:text-blue-400 transition-colors">
        {row.nombre}
        {originBadge(row.origin)}
      </Link>
    ),
  },
  {
    key: 'powerRating',
    label: 'Rating',
    align: 'right',
    sortable: true,
    render: (row) => (
      <span className="font-mono text-gray-300">{row.powerRating > 0 ? '+' : ''}{row.powerRating.toFixed(2)}</span>
    ),
  },
  {
    key: 'pChampion',
    label: 'Campeón',
    align: 'right',
    sortable: true,
    render: (row) => <span className={pctColor(row.pChampion, 'champion')}>{pct(row.pChampion)}</span>,
  },
  {
    key: 'pTop4',
    label: 'Top 4',
    align: 'right',
    sortable: true,
    render: (row) => <span className={pctColor(row.pTop4, 'top4')}>{pct(row.pTop4)}</span>,
  },
  {
    key: 'pBottom4',
    label: 'Descenso',
    align: 'right',
    sortable: true,
    render: (row) => <span className={pctColor(row.pBottom4, 'bottom4')}>{pct(row.pBottom4)}</span>,
  },
  {
    key: 'avgPosition2',
    label: 'Pos. Esp.',
    align: 'right',
    sortable: false,
    render: (row) => <span className="font-mono text-gray-400">{row.avgPosition.toFixed(1)}</span>,
  },
];

export default function PrediccionesPage() {
  const [activeDiv, setActiveDiv] = useState('A');
  const { predictions, loading, error } = usePredictions(activeDiv);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">
          Predicciones T {predictions?.targetYear ?? '2026'}
        </h1>
        <p className="text-gray-400 mt-1">
          Basado en {predictions ? predictions.basedOnTemporada - 89 : '—'} temporadas históricas con ponderación exponencial
        </p>
        <p className="mt-2 text-xs text-gray-500 bg-[#1e293b] inline-block px-3 py-1 rounded-full">
          Modelo estadístico con fines recreativos — No es una predicción oficial
          <span className="mx-1.5">·</span>
          <Link href="/predicciones/metodologia" className="text-blue-400/70 hover:text-blue-300 underline underline-offset-2">
            Cómo se calcula
          </Link>
        </p>
      </div>

      {/* Divisional tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {DIVISIONALS.map((d) => (
          <button
            key={d}
            onClick={() => setActiveDiv(d)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
              activeDiv === d
                ? 'bg-liga-blue text-white'
                : 'bg-liga-card text-gray-400 hover:text-white hover:bg-liga-border'
            }`}
          >
            Div {d}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />
        </div>
      ) : error ? (
        <div className="text-center text-red-400 py-12">{error}</div>
      ) : predictions ? (
        <>
          <SortableTable
            data={predictions.teams as Row[]}
            columns={columns}
            keyField="teamId"
            defaultSort="avgPosition"
            defaultDir="asc"
          />
          <PredictionChart teams={predictions.teams} />
        </>
      ) : null}
    </div>
  );
}
