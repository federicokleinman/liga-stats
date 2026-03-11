'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { SubmissionStatus } from '@/components/planilla/SubmissionStatus';
import type { PlanillaMatch } from '@/lib/planilla/types';

export default function PlanillaTeamDashboard() {
  const router = useRouter();
  const [matches, setMatches] = useState<PlanillaMatch[]>([]);
  const [loading, setLoading] = useState(true);

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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="text-gray-400">Cargando partidos...</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Mis Partidos</h1>
        <button
          onClick={handleLogout}
          className="text-sm text-gray-400 hover:text-white transition-colors"
        >
          Cerrar sesión
        </button>
      </div>

      {matches.length === 0 ? (
        <div className="bg-liga-card border border-liga-border rounded-xl p-8 text-center">
          <p className="text-gray-400">No tenés partidos asignados todavía.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {matches.map((match) => (
            <Link
              key={match.id}
              href={`/planilla/${match.id}`}
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
                    {match.cancha && <span>- {match.cancha}</span>}
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
