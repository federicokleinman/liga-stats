'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Team {
  teamId: string;
  nombre: string;
}

export default function CrearPartidoPage() {
  const router = useRouter();
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(false);

  const [fecha, setFecha] = useState('');
  const [hora, setHora] = useState('');
  const [cancha, setCancha] = useState('');
  const [equipoLocalId, setEquipoLocalId] = useState('');
  const [equipoVisitanteId, setEquipoVisitanteId] = useState('');
  const [error, setError] = useState('');

  // Load teams from existing data
  useEffect(() => {
    fetch('/api/data?view=standings&temporada=112&divisional=A')
      .then((r) => r.json())
      .then((data) => {
        if (data.rows) {
          const unique = new Map<string, string>();
          for (const row of data.rows) {
            if (!unique.has(row.teamId)) {
              unique.set(row.teamId, row.equipoNombreNormalizado || row.equipoNombre);
            }
          }
          const teamList = Array.from(unique.entries())
            .map(([teamId, nombre]) => ({ teamId, nombre }))
            .sort((a, b) => a.nombre.localeCompare(b.nombre));
          setTeams(teamList);
        }
      })
      .catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!fecha || !equipoLocalId || !equipoVisitanteId) {
      setError('Completá los campos obligatorios');
      return;
    }

    if (equipoLocalId === equipoVisitanteId) {
      setError('Los equipos deben ser diferentes');
      return;
    }

    setLoading(true);

    const localTeam = teams.find((t) => t.teamId === equipoLocalId);
    const visitanteTeam = teams.find((t) => t.teamId === equipoVisitanteId);

    try {
      const res = await fetch('/api/planilla/matches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fecha,
          hora,
          cancha,
          divisional: 'A',
          torneo: 'Mayores Masculino',
          equipoLocalId,
          equipoLocalNombre: localTeam?.nombre || equipoLocalId,
          equipoVisitanteId,
          equipoVisitanteNombre: visitanteTeam?.nombre || equipoVisitanteId,
        }),
      });

      if (res.ok) {
        router.push('/planilla/admin');
      } else {
        const data = await res.json();
        setError(data.error || 'Error al crear');
      }
    } catch {
      setError('Error de conexión');
    }
    setLoading(false);
  }

  const inputClass =
    'w-full bg-[#0a0f1a] border border-[#2d3a4f] rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-liga-blue focus:ring-1 focus:ring-liga-blue transition-colors';

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Crear Partido</h1>
        <button
          onClick={() => router.push('/planilla/admin')}
          className="text-gray-400 hover:text-white text-sm transition-colors"
        >
          &larr; Volver
        </button>
      </div>

      <div className="bg-liga-card border border-liga-border rounded-2xl p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                Fecha *
              </label>
              <input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className={inputClass}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                Hora
              </label>
              <input
                type="time"
                value={hora}
                onChange={(e) => setHora(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              Cancha
            </label>
            <input
              type="text"
              value={cancha}
              onChange={(e) => setCancha(e.target.value)}
              className={inputClass}
              placeholder="Nombre de la cancha"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              Equipo Local *
            </label>
            <select
              value={equipoLocalId}
              onChange={(e) => setEquipoLocalId(e.target.value)}
              className={inputClass}
              required
            >
              <option value="">Seleccionar equipo</option>
              {teams.map((t) => (
                <option key={t.teamId} value={t.teamId}>
                  {t.nombre}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              Equipo Visitante *
            </label>
            <select
              value={equipoVisitanteId}
              onChange={(e) => setEquipoVisitanteId(e.target.value)}
              className={inputClass}
              required
            >
              <option value="">Seleccionar equipo</option>
              {teams
                .filter((t) => t.teamId !== equipoLocalId)
                .map((t) => (
                  <option key={t.teamId} value={t.teamId}>
                    {t.nombre}
                  </option>
                ))}
            </select>
          </div>

          <div className="bg-[#0a0f1a]/50 rounded-lg p-3 text-sm text-gray-400">
            Divisional: <span className="text-liga-sky font-medium">A</span> — Torneo:{' '}
            <span className="text-liga-sky font-medium">Mayores Masculino</span>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-lg font-medium transition-colors bg-liga-blue text-white hover:bg-liga-blue/80 disabled:opacity-50"
          >
            {loading ? 'Creando...' : 'Crear Partido'}
          </button>
        </form>
      </div>
    </div>
  );
}
