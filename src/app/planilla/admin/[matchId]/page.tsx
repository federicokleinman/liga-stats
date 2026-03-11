'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { MatchHeader } from '@/components/planilla/MatchHeader';
import type {
  PlanillaMatch,
  MatchSubmission,
  MatchValidation,
  Discrepancy,
  RosterPlayer,
  MatchEvent,
} from '@/lib/planilla/types';

export default function AdminValidationPage() {
  const params = useParams();
  const router = useRouter();
  const matchId = params.matchId as string;

  const [match, setMatch] = useState<PlanillaMatch | null>(null);
  const [local, setLocal] = useState<MatchSubmission | null>(null);
  const [visitante, setVisitante] = useState<MatchSubmission | null>(null);
  const [validation, setValidation] = useState<MatchValidation | null>(null);
  const [discrepancies, setDiscrepancies] = useState<Discrepancy[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/planilla/admin/validation?matchId=${matchId}`)
      .then((r) => r.json())
      .then((data) => {
        setMatch(data.match);
        setLocal(data.local);
        setVisitante(data.visitante);
        setValidation(data.validation);
        setDiscrepancies(data.discrepancies || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [matchId]);

  async function handleValidate() {
    if (!validation || !match) return;
    setSaving(true);
    try {
      const toSave: MatchValidation = {
        ...validation,
        discrepancies,
        status: 'validated',
      };
      const res = await fetch('/api/planilla/admin/validation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(toSave),
      });
      if (res.ok) {
        const data = await res.json();
        setValidation(data.validation);
        setMatch((m) => m ? { ...m, status: 'validated' } : m);
      }
    } catch { /* ignore */ }
    setSaving(false);
  }

  async function handlePublish() {
    setSaving(true);
    try {
      const res = await fetch(`/api/planilla/admin/validation?matchId=${matchId}`, {
        method: 'PUT',
      });
      if (res.ok) {
        const data = await res.json();
        setValidation(data.validation);
        setMatch(data.match);
      }
    } catch { /* ignore */ }
    setSaving(false);
  }

  function resolveDiscrepancy(id: string, value: string) {
    setDiscrepancies((prev) =>
      prev.map((d) => (d.id === id ? { ...d, resolvedValue: value, resolvedBy: 'admin' } : d)),
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="text-gray-400">Cargando datos del partido...</div>
      </div>
    );
  }

  if (!match) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-400">Partido no encontrado</p>
      </div>
    );
  }

  const allResolved = discrepancies.length === 0 || discrepancies.every((d) => d.resolvedValue);

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.push('/planilla/admin')}
          className="text-gray-400 hover:text-white text-sm transition-colors"
        >
          &larr; Panel Admin
        </button>
      </div>

      <MatchHeader match={match} />

      {/* Submission status */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatusCard
          label={match.equipoLocalNombre}
          subtitle="Local"
          submitted={!!local?.submittedAt}
          submittedAt={local?.submittedAt}
        />
        <StatusCard
          label={match.equipoVisitanteNombre}
          subtitle="Visitante"
          submitted={!!visitante?.submittedAt}
          submittedAt={visitante?.submittedAt}
        />
      </div>

      {/* Side by side comparison */}
      {local && visitante && (
        <>
          {/* Result comparison */}
          <div className="bg-liga-card border border-liga-border rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Resultado</h3>
            <div className="grid grid-cols-2 gap-6">
              <div className="text-center">
                <div className="text-sm text-gray-400 mb-2">{match.equipoLocalNombre}</div>
                <div className="text-3xl font-bold text-white">
                  {local.golesClub} - {local.golesRival}
                </div>
                <div className="text-xs text-gray-500 mt-1">Según local</div>
              </div>
              <div className="text-center">
                <div className="text-sm text-gray-400 mb-2">{match.equipoVisitanteNombre}</div>
                <div className="text-3xl font-bold text-white">
                  {visitante.golesRival} - {visitante.golesClub}
                </div>
                <div className="text-xs text-gray-500 mt-1">Según visitante</div>
              </div>
            </div>
          </div>

          {/* Rosters side by side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <RosterSection
              title={`${match.equipoLocalNombre} — Titulares`}
              players={local.roster.filter((p) => p.esTitular)}
              capitanCarne={local.capitanCarne}
            />
            <RosterSection
              title={`${match.equipoVisitanteNombre} — Titulares`}
              players={visitante.roster.filter((p) => p.esTitular)}
              capitanCarne={visitante.capitanCarne}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <RosterSection
              title={`${match.equipoLocalNombre} — Suplentes`}
              players={local.roster.filter((p) => !p.esTitular)}
            />
            <RosterSection
              title={`${match.equipoVisitanteNombre} — Suplentes`}
              players={visitante.roster.filter((p) => !p.esTitular)}
            />
          </div>

          {/* Events side by side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <EventsSection title={`Eventos — ${match.equipoLocalNombre}`} events={local.events} />
            <EventsSection title={`Eventos — ${match.equipoVisitanteNombre}`} events={visitante.events} />
          </div>

          {/* Staff info */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-liga-card border border-liga-border rounded-xl p-4">
              <h4 className="text-sm font-medium text-gray-400 mb-2">DT {match.equipoLocalNombre}</h4>
              <p className="text-white">{local.dtNombre || '—'} <span className="text-gray-500">CI: {local.dtCI || '—'}</span></p>
            </div>
            <div className="bg-liga-card border border-liga-border rounded-xl p-4">
              <h4 className="text-sm font-medium text-gray-400 mb-2">DT {match.equipoVisitanteNombre}</h4>
              <p className="text-white">{visitante.dtNombre || '—'} <span className="text-gray-500">CI: {visitante.dtCI || '—'}</span></p>
            </div>
          </div>
        </>
      )}

      {/* Discrepancies */}
      {discrepancies.length > 0 && (
        <div className="bg-liga-card border border-liga-border rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">
            Discrepancias ({discrepancies.filter((d) => !d.resolvedValue).length} sin resolver)
          </h3>
          <div className="space-y-3">
            {discrepancies.map((disc) => (
              <div
                key={disc.id}
                className={`p-4 rounded-lg border ${
                  disc.resolvedValue
                    ? 'bg-green-500/5 border-green-500/20'
                    : 'bg-orange-500/5 border-orange-500/20'
                }`}
              >
                <p className="text-sm text-white mb-2">{disc.description}</p>
                <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                  <div className="flex gap-2">
                    <button
                      onClick={() => resolveDiscrepancy(disc.id, disc.localValue)}
                      className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                        disc.resolvedValue === disc.localValue
                          ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                          : 'bg-[#0a0f1a] text-gray-400 hover:text-white border border-[#2d3a4f]'
                      }`}
                    >
                      Local: {disc.localValue}
                    </button>
                    <button
                      onClick={() => resolveDiscrepancy(disc.id, disc.visitanteValue)}
                      className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                        disc.resolvedValue === disc.visitanteValue
                          ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                          : 'bg-[#0a0f1a] text-gray-400 hover:text-white border border-[#2d3a4f]'
                      }`}
                    >
                      Visitante: {disc.visitanteValue}
                    </button>
                  </div>
                  {disc.resolvedValue && (
                    <span className="text-green-400 text-xs">Resuelto</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {discrepancies.length === 0 && local && visitante && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 text-green-400 text-sm">
          No se detectaron discrepancias entre ambas planillas.
        </div>
      )}

      {/* Actions */}
      {local && visitante && match.status !== 'published' && (
        <div className="flex flex-col sm:flex-row gap-3">
          {match.status !== 'validated' && (
            <button
              onClick={handleValidate}
              disabled={saving || !allResolved}
              className="flex-1 py-3 rounded-lg font-medium transition-colors bg-liga-blue text-white hover:bg-liga-blue/80 disabled:opacity-50"
            >
              {saving ? 'Validando...' : 'Validar Partido'}
            </button>
          )}
          {match.status === 'validated' && (
            <button
              onClick={handlePublish}
              disabled={saving}
              className="flex-1 py-3 rounded-lg font-medium transition-colors bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {saving ? 'Publicando...' : 'Publicar Partido'}
            </button>
          )}
        </div>
      )}

      {match.status === 'published' && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 text-emerald-400 text-sm text-center">
          Este partido ha sido publicado.{' '}
          <a href={`/planilla/resumen/${matchId}`} className="underline hover:text-white">
            Ver resumen público
          </a>
        </div>
      )}
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────

function StatusCard({
  label,
  subtitle,
  submitted,
  submittedAt,
}: {
  label: string;
  subtitle: string;
  submitted: boolean;
  submittedAt?: string | null;
}) {
  return (
    <div className={`bg-liga-card border rounded-xl p-4 ${submitted ? 'border-green-500/30' : 'border-liga-border'}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white font-medium">{label}</p>
          <p className="text-xs text-gray-500">{subtitle}</p>
        </div>
        <div className="text-right">
          <span className={`text-sm font-medium ${submitted ? 'text-green-400' : 'text-gray-500'}`}>
            {submitted ? 'Enviada' : 'Pendiente'}
          </span>
          {submittedAt && (
            <p className="text-xs text-gray-500">
              {new Date(submittedAt).toLocaleString('es-UY')}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function RosterSection({
  title,
  players,
  capitanCarne,
}: {
  title: string;
  players: RosterPlayer[];
  capitanCarne?: string;
}) {
  return (
    <div className="bg-liga-card border border-liga-border rounded-xl p-4">
      <h4 className="text-sm font-medium text-gray-400 mb-3">{title}</h4>
      <div className="space-y-1">
        {players.map((p, i) => (
          <div key={i} className="flex items-center gap-2 text-sm py-1">
            {p.fotoFilename ? (
              <div className="w-7 h-7 rounded-full overflow-hidden border border-green-500/40 shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/planilla/photos?filename=${encodeURIComponent(p.fotoFilename)}`}
                  alt={p.nombre}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="w-7 h-7 rounded-full bg-gray-700/50 shrink-0" />
            )}
            <span className="text-gray-500 w-8 text-right">#{p.camiseta}</span>
            <span className="text-white flex-1">{p.nombre}</span>
            <span className="text-gray-500 text-xs">{p.carne}</span>
            {capitanCarne === p.carne && (
              <span className="text-yellow-400 text-xs font-medium">C</span>
            )}
          </div>
        ))}
        {players.length === 0 && (
          <p className="text-gray-500 text-sm">Sin jugadores</p>
        )}
      </div>
    </div>
  );
}

function EventsSection({ title, events }: { title: string; events: MatchEvent[] }) {
  const typeColors: Record<string, string> = {
    gol: 'text-green-400',
    amarilla: 'text-yellow-400',
    roja: 'text-red-400',
    cambio: 'text-blue-400',
  };

  return (
    <div className="bg-liga-card border border-liga-border rounded-xl p-4">
      <h4 className="text-sm font-medium text-gray-400 mb-3">{title}</h4>
      <div className="space-y-1">
        {events.map((e) => (
          <div key={e.id} className="flex items-center gap-2 text-sm py-1">
            <span className="text-gray-500 font-mono w-8 text-right">{e.minuto}&apos;</span>
            <span className={`text-xs w-14 ${typeColors[e.type]}`}>{e.type}</span>
            <span className="text-white flex-1 truncate">
              {e.type === 'cambio'
                ? `${e.jugadorSaleNombre} → ${e.jugadorEntraNombre}`
                : `${e.jugadorNombre}${e.enContra ? ' (e/c)' : ''}`}
            </span>
          </div>
        ))}
        {events.length === 0 && (
          <p className="text-gray-500 text-sm">Sin eventos</p>
        )}
      </div>
    </div>
  );
}
