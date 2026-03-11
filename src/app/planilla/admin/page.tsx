'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { SubmissionStatus } from '@/components/planilla/SubmissionStatus';
import type { PlanillaMatch, MatchStatus } from '@/lib/planilla/types';

const STATUS_TABS: { status: MatchStatus | 'all'; label: string }[] = [
  { status: 'all', label: 'Todos' },
  { status: 'pending', label: 'Pendientes' },
  { status: 'submitted_one', label: 'Un envío' },
  { status: 'submitted_both', label: 'Ambos enviaron' },
  { status: 'validated', label: 'Validados' },
  { status: 'published', label: 'Publicados' },
];

export default function AdminDashboard() {
  const router = useRouter();
  const [matches, setMatches] = useState<PlanillaMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<MatchStatus | 'all'>('all');

  useEffect(() => {
    fetch('/api/planilla/matches')
      .then((r) => r.json())
      .then((data) => {
        setMatches(data.matches || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function handleLogout() {
    await fetch('/api/planilla/auth/logout', { method: 'POST' });
    router.push('/planilla/login');
  }

  const filtered = filter === 'all' ? matches : matches.filter((m) => m.status === filter);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Panel de Administración</h1>
        <div className="flex items-center gap-4">
          <Link
            href="/planilla/admin/crear"
            className="px-4 py-2 bg-liga-blue text-white rounded-lg text-sm font-medium hover:bg-liga-blue/80 transition-colors"
          >
            + Crear Partido
          </Link>
          <button
            onClick={handleLogout}
            className="text-sm text-gray-400 hover:text-white transition-colors"
          >
            Salir
          </button>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 overflow-x-auto bg-[#0a0f1a] rounded-lg p-1">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.status}
            onClick={() => setFilter(tab.status)}
            className={`px-3 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${
              filter === tab.status
                ? 'bg-liga-blue text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            {tab.label}
            {tab.status !== 'all' && (
              <span className="ml-1.5 text-xs opacity-60">
                ({matches.filter((m) => m.status === tab.status).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-gray-400 text-center py-8">Cargando...</div>
      ) : filtered.length === 0 ? (
        <div className="bg-liga-card border border-liga-border rounded-xl p-8 text-center">
          <p className="text-gray-400">No hay partidos en este estado.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((match) => (
            <Link
              key={match.id}
              href={
                match.status === 'submitted_both' || match.status === 'validated' || match.status === 'published'
                  ? `/planilla/admin/${match.id}`
                  : `/planilla/admin/${match.id}`
              }
              className="block bg-liga-card border border-liga-border rounded-xl p-5 hover:border-liga-blue/50 transition-colors group"
            >
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-white font-semibold group-hover:text-liga-sky transition-colors">
                      {match.equipoLocalNombre}
                    </span>
                    <span className="text-gray-500">vs</span>
                    <span className="text-white font-semibold group-hover:text-liga-sky transition-colors">
                      {match.equipoVisitanteNombre}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2 text-sm text-gray-400">
                    <span>
                      {new Date(match.fecha).toLocaleDateString('es-UY', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                    {match.hora && <span>- {match.hora}</span>}
                    <span className="text-liga-sky">Div. {match.divisional}</span>
                  </div>
                </div>
                <SubmissionStatus status={match.status} />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
