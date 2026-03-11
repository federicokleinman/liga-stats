'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

type Mode = 'team' | 'admin';

export default function PlanillaLoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('team');
  const [teamIds, setTeamIds] = useState<string[]>([]);
  const [teamId, setTeamId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('/api/planilla/auth')
      .then((r) => r.json())
      .then((data) => {
        setTeamIds(data.teamIds || []);
        if (data.teamIds?.length > 0) setTeamId(data.teamIds[0]);
      })
      .catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/planilla/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: mode,
          teamId: mode === 'team' ? teamId : undefined,
          password,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Error al iniciar sesión');
        return;
      }

      if (mode === 'admin') {
        router.push('/planilla/admin');
      } else {
        router.push('/planilla');
      }
    } catch {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    'w-full bg-[#0a0f1a] border border-[#2d3a4f] rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-liga-blue focus:ring-1 focus:ring-liga-blue transition-colors';

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="w-full max-w-md">
        <div className="bg-liga-card border border-liga-border rounded-2xl p-8">
          <h1 className="text-2xl font-bold text-white mb-2 text-center">
            Planilla Digital
          </h1>
          <p className="text-gray-400 text-sm text-center mb-8">
            Ingresá con tus credenciales para cargar la planilla del partido
          </p>

          {/* Mode tabs */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setMode('team')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                mode === 'team'
                  ? 'bg-liga-blue text-white'
                  : 'bg-[#0a0f1a] text-gray-400 hover:text-white'
              }`}
            >
              Equipo
            </button>
            <button
              onClick={() => setMode('admin')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                mode === 'admin'
                  ? 'bg-liga-blue text-white'
                  : 'bg-[#0a0f1a] text-gray-400 hover:text-white'
              }`}
            >
              Liga (Admin)
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'team' && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                  Equipo
                </label>
                <select
                  value={teamId}
                  onChange={(e) => setTeamId(e.target.value)}
                  className={inputClass}
                >
                  {teamIds.length === 0 && (
                    <option value="">No hay equipos configurados</option>
                  )}
                  {teamIds.map((id) => (
                    <option key={id} value={id}>
                      {id.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                Contraseña
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClass}
                placeholder="Ingresá tu contraseña"
                required
              />
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || (mode === 'team' && !teamId)}
              className="w-full py-3 rounded-lg font-medium transition-colors bg-liga-blue text-white hover:bg-liga-blue/80 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Ingresando...' : 'Ingresar'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
