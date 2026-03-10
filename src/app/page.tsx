'use client';

import { Suspense, useState, useEffect, useMemo } from 'react';
import { useMetrics, useTorneo, useStandings, usePredictions } from '@/lib/hooks';
import { Card } from '@/components/Card';
import { IngestProgress } from '@/components/IngestProgress';
import { SortableTable, Column } from '@/components/SortableTable';
import { temporadaToYear } from '@/lib/types';
import type { StandingRow } from '@/lib/types';
import type { PlayerSeason } from '@/lib/playerTypes';
import Link from 'next/link';
import Image from 'next/image';

const LATEST_TEMP = 112;
const LATEST_YEAR = temporadaToYear(LATEST_TEMP);
const DIVISIONALS = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];

function DivisionalTabs({ active, onChange }: { active: string; onChange: (d: string) => void }) {
  return (
    <div className="flex gap-1 overflow-x-auto pb-1">
      {DIVISIONALS.map((d) => (
        <button
          key={d}
          onClick={() => onChange(d)}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
            active === d
              ? 'bg-liga-blue text-white'
              : 'bg-liga-card text-gray-400 hover:text-white hover:bg-liga-border'
          }`}
        >
          Div {d}
        </button>
      ))}
    </div>
  );
}

function normalizeName(name: string) {
  return name
    .toLowerCase()
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function HomeContent() {
  const [torneo] = useTorneo();
  const { metrics, loading, error, progress } = useMetrics(torneo);
  const [activeDiv, setActiveDiv] = useState('A');
  const { rows: standingsRows, loading: standingsLoading } = useStandings(LATEST_TEMP, activeDiv, torneo);

  // All T112 standings (all divisionals) for season-wide stats
  const { rows: allT112Rows } = useStandings(LATEST_TEMP, null, torneo);

  // Player data for top scorers
  const [players, setPlayers] = useState<PlayerSeason[]>([]);
  const [playersLoading, setPlayersLoading] = useState(true);

  useEffect(() => {
    fetch('/api/players?temporada=112&divisional=TODAS&torneo=Mayores%20Masculino')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d?.players) setPlayers(d.players); })
      .catch(() => {})
      .finally(() => setPlayersLoading(false));
  }, []);

  // Predictions teaser
  const { predictions } = usePredictions();

  const topScorers = useMemo(() => {
    return [...players]
      .filter((p) => p.goles > 0)
      .sort((a, b) => b.goles - a.goles)
      .slice(0, 5);
  }, [players]);

  // Season-wide stats from all divisionals
  const seasonStats = useMemo(() => {
    if (!allT112Rows.length) return { teams: 0, matches: 0, goals: 0 };
    const teams = allT112Rows.length;
    const totalPJ = allT112Rows.reduce((sum, r) => sum + r.pj, 0);
    const matches = Math.round(totalPJ / 2); // each match counted twice
    const goals = allT112Rows.reduce((sum, r) => sum + r.gf, 0);
    return { teams, matches, goals };
  }, [allT112Rows]);

  const divALeader = useMemo(() => {
    if (!standingsRows.length || activeDiv !== 'A') return null;
    const sorted = [...standingsRows].sort((a, b) => a.posicion - b.posicion);
    return sorted[0] || null;
  }, [standingsRows, activeDiv]);

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
          <div className="animate-spin h-10 w-10 border-4 border-liga-blue border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-400">Cargando datos...</p>
        </div>
      </div>
    );
  }

  if (error || !metrics) {
    return (
      <div className="bg-liga-card border border-yellow-600/30 rounded-xl p-8 text-center">
        <h2 className="text-xl font-bold text-yellow-400 mb-2">Error</h2>
        <p className="text-gray-400">{error || 'Error cargando datos. Intentá de nuevo en unos minutos.'}</p>
      </div>
    );
  }

  const topScorer = topScorers[0];

  // Standings table columns
  const standingsCols: Column<StandingRow & { _rank: number }>[] = [
    { key: '_rank', label: '#', align: 'center', sortable: false },
    {
      key: 'equipoNombreNormalizado',
      label: 'Equipo',
      render: (row) => (
        <Link href={`/equipos/${row.teamId}`} className="text-liga-sky hover:text-white hover:underline transition-colors">
          {row.equipoNombreNormalizado}
        </Link>
      ),
    },
    { key: 'pj', label: 'PJ', align: 'center' },
    { key: 'pg', label: 'PG', align: 'center' },
    { key: 'pe', label: 'PE', align: 'center' },
    { key: 'pp', label: 'PP', align: 'center' },
    { key: 'gf', label: 'GF', align: 'center' },
    { key: 'gc', label: 'GC', align: 'center' },
    {
      key: 'diferencia',
      label: 'Dif',
      align: 'center',
      render: (row) => (
        <span className={row.diferencia > 0 ? 'text-green-400' : row.diferencia < 0 ? 'text-red-400' : ''}>
          {row.diferencia > 0 ? '+' : ''}{row.diferencia}
        </span>
      ),
    },
    {
      key: 'puntos',
      label: 'Pts',
      align: 'center',
      render: (row) => <span className="font-bold text-white">{row.puntos}</span>,
    },
  ];

  return (
    <div className="space-y-10">
      {/* Hero Section — fuses with transparent nav */}
      <div className="-mx-4 sm:-mx-6 lg:-mx-8 -mt-10 relative overflow-hidden">
        <div className="relative h-[420px] sm:h-[480px]">
          <Image
            src="/hero.png"
            alt="Liga Universitaria"
            fill
            priority
            className="object-cover object-center"
          />
          {/* Gradient overlays */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#0c1220]/70 via-[#0c1220]/40 to-[#0c1220]" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0c1220]/60 via-transparent to-[#0c1220]/60" />

          {/* Hero content */}
          <div className="absolute inset-0 flex items-center justify-center text-center">
            <div className="max-w-3xl px-4">
              <p className="text-liga-sky font-semibold tracking-widest uppercase text-sm mb-3">
                Liga Universitaria de Deportes
              </p>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white drop-shadow-lg leading-tight">
                Cada partido cuenta una historia
              </h1>
              <p className="text-gray-300 mt-4 text-lg sm:text-xl max-w-2xl mx-auto">
                Datos, predicciones y estadísticas de todas las temporadas. Descubrí quién domina la cancha.
              </p>
              <div className="mt-6 flex items-center justify-center gap-3 flex-wrap">
                <Link
                  href="/predicciones"
                  className="px-5 py-2.5 bg-liga-blue hover:bg-[#1a6fd4] text-white font-semibold rounded-lg transition-colors text-sm"
                >
                  Ver predicciones {LATEST_YEAR + 1}
                </Link>
                <Link
                  href="/comparar"
                  className="px-5 py-2.5 bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20 text-white font-semibold rounded-lg transition-colors text-sm"
                >
                  Comparar equipos
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-3xl font-bold">Temporada {LATEST_YEAR}</h2>
          <p className="text-gray-400 mt-1">Fútbol Mayores Masculino</p>
        </div>
        <span className="text-xs text-gray-500 bg-liga-card border border-liga-border px-3 py-1 rounded-full">
          T {LATEST_YEAR} · Div A–G
        </span>
      </div>

      {/* Season stat cards */}
      <div>
        <p className="text-xs text-gray-500 mb-3 uppercase tracking-wider">Resumen Temporada {LATEST_YEAR}</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Link href="/historico/equipos" className="block">
            <Card
              title="Equipos"
              value={seasonStats.teams || '—'}
              subtitle="en todas las divisionales"
              icon="👥"
            />
          </Link>
          <Link href="/historico/temporadas" className="block">
            <Card
              title="Partidos jugados"
              value={seasonStats.matches || '—'}
              subtitle="Div A–G combinadas"
              icon="📋"
            />
          </Link>
          <Link href="/historico/temporadas" className="block">
            <Card
              title="Goles totales"
              value={seasonStats.goals || '—'}
              subtitle={seasonStats.matches ? `${(seasonStats.goals / seasonStats.matches).toFixed(1)} por partido` : ''}
              icon="⚽"
            />
          </Link>
          <Link href="/jugadores" className="block">
            <Card
              title="Goleador"
              value={topScorer ? normalizeName(topScorer.nombre) : '—'}
              subtitle={topScorer ? `${topScorer.goles} goles — ${normalizeName(topScorer.equipo)}` : ''}
              icon="🥇"
            />
          </Link>
        </div>
      </div>

      {/* Standings with divisional tabs */}
      <section>
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <h2 className="text-2xl font-bold">Posiciones T {LATEST_YEAR}</h2>
          <Link
            href="/historico/temporadas"
            className="text-liga-sky hover:text-white text-sm hover:underline transition-colors"
          >
            Ver todas las temporadas →
          </Link>
        </div>

        <DivisionalTabs active={activeDiv} onChange={setActiveDiv} />

        <div className="mt-4">
          {standingsLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin h-8 w-8 border-4 border-liga-blue border-t-transparent rounded-full" />
            </div>
          ) : standingsRows.length > 0 ? (
            <SortableTable
              data={standingsRows.map((r, i) => ({ ...r, _rank: i + 1 }))}
              columns={standingsCols}
              keyField="teamId"
              defaultSort="puntos"
            />
          ) : (
            <p className="text-gray-500 text-center py-8">No hay datos para Divisional {activeDiv}.</p>
          )}
        </div>
      </section>

      {/* Top 5 Goleadores */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">Top Goleadores</h2>
          <Link
            href="/jugadores"
            className="text-liga-sky hover:text-white text-sm hover:underline transition-colors"
          >
            Ver todos →
          </Link>
        </div>

        {playersLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin h-8 w-8 border-4 border-liga-blue border-t-transparent rounded-full" />
          </div>
        ) : topScorers.length > 0 ? (
          <div className="bg-liga-card border border-liga-border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-liga-border text-gray-400 bg-[#142240]">
                  <th className="px-4 py-3 text-center w-10">#</th>
                  <th className="px-4 py-3 text-left">Jugador</th>
                  <th className="px-4 py-3 text-left">Equipo</th>
                  <th className="px-4 py-3 text-center">PJ</th>
                  <th className="px-4 py-3 text-center">Goles</th>
                </tr>
              </thead>
              <tbody>
                {topScorers.map((p, i) => (
                  <tr key={p.playerId} className="border-b border-liga-border/50 hover:bg-liga-blue/10 transition-colors">
                    <td className="px-4 py-3 text-center text-gray-500 font-mono">{i + 1}</td>
                    <td className="px-4 py-3">
                      <Link href={`/jugadores/${p.playerId}`} className="text-white hover:text-liga-sky font-medium transition-colors">
                        {normalizeName(p.nombre)}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-400">{normalizeName(p.equipo)}</td>
                    <td className="px-4 py-3 text-center text-gray-300">{p.pj}</td>
                    <td className="px-4 py-3 text-center font-bold text-white">{p.goles}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">No hay datos de goleadores disponibles.</p>
        )}
      </section>

      {/* Predictions teaser */}
      {predictions && (
        <section>
          <div className="bg-gradient-to-r from-liga-card to-[#142240] border border-liga-border rounded-xl p-6">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
              <div>
                <h2 className="text-xl font-bold">Predicciones T {predictions.targetYear}</h2>
                <p className="text-gray-400 text-sm mt-1">Simulación Monte Carlo basada en datos históricos</p>
              </div>
              <Link
                href="/predicciones"
                className="text-sm px-4 py-2 bg-liga-blue hover:bg-[#1a6fd4] text-white rounded-lg transition-colors font-medium"
              >
                Ver predicciones completas →
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {predictions.teams
                .sort((a, b) => b.pChampion - a.pChampion)
                .slice(0, 3)
                .map((team, i) => (
                  <div key={team.teamId} className="bg-liga-dark/50 rounded-lg p-4 border border-liga-border/50">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-yellow-400 text-lg">{i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}</span>
                      <Link href={`/equipos/${team.teamId}`} className="font-semibold text-white hover:text-liga-sky transition-colors">
                        {team.nombre}
                      </Link>
                    </div>
                    <div className="text-2xl font-bold text-yellow-300">
                      {Math.round(team.pChampion * 100)}%
                    </div>
                    <p className="text-xs text-gray-500 mt-1">probabilidad campeón</p>
                  </div>
                ))}
            </div>
          </div>
        </section>
      )}

      {/* Explore section */}
      <section className="bg-[#0f1a2e] border border-liga-border rounded-2xl p-8 space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold">Explorá más</h2>
          <p className="text-gray-400 mt-1">Herramientas para analizar la Liga en profundidad</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            href="/comparar"
            className="bg-liga-dark border border-liga-border rounded-xl p-5 hover:border-liga-sky/40 transition-all hover:-translate-y-0.5 group text-center"
          >
            <span className="text-3xl block mb-3">⚔️</span>
            <h3 className="text-lg font-bold group-hover:text-liga-sky transition-colors">Comparar equipos</h3>
            <p className="text-gray-500 text-sm mt-1">Enfrentá el historial de dos equipos cara a cara</p>
            <span className="inline-block mt-3 text-sm text-liga-sky font-medium group-hover:underline">Comparar →</span>
          </Link>
          <Link
            href="/comparar?tab=jugadores"
            className="bg-liga-dark border border-liga-border rounded-xl p-5 hover:border-green-500/40 transition-all hover:-translate-y-0.5 group text-center"
          >
            <span className="text-3xl block mb-3">🤺</span>
            <h3 className="text-lg font-bold group-hover:text-green-300 transition-colors">Comparar jugadores</h3>
            <p className="text-gray-500 text-sm mt-1">Medite con tu rival y descubrí quién es mejor</p>
            <span className="inline-block mt-3 text-sm text-green-400 font-medium group-hover:underline">Duelo →</span>
          </Link>
          <Link
            href="/predicciones"
            className="bg-liga-dark border border-liga-border rounded-xl p-5 hover:border-yellow-500/40 transition-all hover:-translate-y-0.5 group text-center"
          >
            <span className="text-3xl block mb-3">📊</span>
            <h3 className="text-lg font-bold group-hover:text-yellow-300 transition-colors">Predicciones {predictions ? predictions.targetYear : LATEST_YEAR + 1}</h3>
            <p className="text-gray-500 text-sm mt-1">Simulación estadística de la próxima temporada</p>
            <span className="inline-block mt-3 text-sm text-yellow-400 font-medium group-hover:underline">Ver predicciones →</span>
          </Link>
          <Link
            href="/historico"
            className="bg-liga-dark border border-liga-border rounded-xl p-5 hover:border-liga-sky/40 transition-all hover:-translate-y-0.5 group text-center"
          >
            <span className="text-3xl block mb-3">📚</span>
            <h3 className="text-lg font-bold group-hover:text-liga-sky transition-colors">Archivo Histórico</h3>
            <p className="text-gray-500 text-sm mt-1">Rankings, récords y estadísticas desde 2003</p>
            <span className="inline-block mt-3 text-sm text-liga-sky font-medium group-hover:underline">Explorar →</span>
          </Link>
        </div>
      </section>
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[60vh]"><div className="animate-spin h-10 w-10 border-4 border-liga-blue border-t-transparent rounded-full" /></div>}>
      <HomeContent />
    </Suspense>
  );
}
