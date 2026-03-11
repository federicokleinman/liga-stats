'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { MatchHeader } from '@/components/planilla/MatchHeader';
import { RosterForm } from '@/components/planilla/RosterForm';
import { EventForm } from '@/components/planilla/EventForm';
import { SubmissionStatus } from '@/components/planilla/SubmissionStatus';
import type {
  PlanillaMatch,
  MatchSubmission,
  RosterPlayer,
  MatchEvent,
  PlayerOption,
  ValidationIssue,
} from '@/lib/planilla/types';

export default function PlanillaMatchPage() {
  const params = useParams();
  const router = useRouter();
  const matchId = params.matchId as string;

  const [match, setMatch] = useState<PlanillaMatch | null>(null);
  const [teamId, setTeamId] = useState('');
  const [teamName, setTeamName] = useState('');
  const [esLocal, setEsLocal] = useState(true);
  const [availablePlayers, setAvailablePlayers] = useState<PlayerOption[]>([]);
  const [issues, setIssues] = useState<ValidationIssue[]>([]);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [lastSaved, setLastSaved] = useState('');
  const [confirmSubmit, setConfirmSubmit] = useState(false);

  // Submission state
  const [status, setStatus] = useState<'draft' | 'submitted'>('draft');
  const [titulares, setTitulares] = useState<RosterPlayer[]>([]);
  const [suplentes, setSuplentes] = useState<RosterPlayer[]>([]);
  const [events, setEvents] = useState<MatchEvent[]>([]);
  const [golesClub, setGolesClub] = useState(0);
  const [golesRival, setGolesRival] = useState(0);
  const [dtNombre, setDtNombre] = useState('');
  const [dtCI, setDtCI] = useState('');
  const [dtFirma, setDtFirma] = useState(false);
  const [capitanCarne, setCapitanCarne] = useState('');
  const [observaciones, setObservaciones] = useState('');

  // Load match and session info
  useEffect(() => {
    async function load() {
      // Get match info from the team's match list
      const matchRes = await fetch('/api/planilla/matches');
      const matchData = await matchRes.json();
      const m = matchData.matches?.find((m: PlanillaMatch) => m.id === matchId);
      if (!m) {
        router.push('/planilla');
        return;
      }
      setMatch(m);

      // Determine team from cookie (parsed by middleware into headers - but client side we need another way)
      // We'll figure out team from which matches we can see
      const subRes = await fetch(`/api/planilla/submissions?matchId=${matchId}`);
      const subData = await subRes.json();

      // If we got a submission, we know our teamId
      if (subData.submission) {
        const sub = subData.submission as MatchSubmission;
        setTeamId(sub.teamId);
        setTeamName(sub.teamName);
        setEsLocal(sub.esLocal);
        loadSubmission(sub);
      } else {
        // First time - determine team from match
        // Try to figure out which team we are from the auth API
        const authRes = await fetch('/api/planilla/auth');
        const authData = await authRes.json();
        // The configured team IDs are in authData.teamIds
        // Check which of our team IDs matches this match
        const tIds = authData.teamIds || [];
        let myTeamId = '';
        let isLocal = true;
        for (const tid of tIds) {
          if (m.equipoLocalId === tid) { myTeamId = tid; isLocal = true; break; }
          if (m.equipoVisitanteId === tid) { myTeamId = tid; isLocal = false; break; }
        }
        if (!myTeamId) {
          // Fallback: pick local
          myTeamId = m.equipoLocalId;
          isLocal = true;
        }
        setTeamId(myTeamId);
        setTeamName(isLocal ? m.equipoLocalNombre : m.equipoVisitanteNombre);
        setEsLocal(isLocal);
      }

      // Load available players for autocomplete
      try {
        const playersRes = await fetch(
          `/api/players?temporada=112&divisional=A&torneo=${encodeURIComponent('Mayores Masculino')}`,
        );
        const playersData = await playersRes.json();
        if (playersData.players) {
          setAvailablePlayers(
            playersData.players.map((p: { playerId: string; nombre: string; carne: string; equipo: string }) => ({
              playerId: p.playerId,
              nombre: p.nombre,
              carne: p.carne,
              equipo: p.equipo,
            })),
          );
        }
      } catch { /* players optional */ }
    }

    load();
  }, [matchId, router]);

  // Filter available players by team once we know our team
  const teamPlayers = availablePlayers.filter((p) => {
    if (!teamName) return true;
    return p.equipo.toLowerCase().includes(teamName.toLowerCase()) ||
           teamName.toLowerCase().includes(p.equipo.toLowerCase());
  });

  function loadSubmission(sub: MatchSubmission) {
    setStatus(sub.status);
    setGolesClub(sub.golesClub);
    setGolesRival(sub.golesRival);
    setDtNombre(sub.dtNombre);
    setDtCI(sub.dtCI);
    setDtFirma(sub.dtFirma);
    setCapitanCarne(sub.capitanCarne);
    setObservaciones(sub.observaciones);
    setEvents(sub.events);
    setTitulares(sub.roster.filter((p) => p.esTitular));
    setSuplentes(sub.roster.filter((p) => !p.esTitular));
  }

  const buildSubmission = useCallback((): MatchSubmission => {
    return {
      id: `${matchId}-${teamId}`,
      matchId,
      teamId,
      teamName,
      status,
      rival: esLocal
        ? match?.equipoVisitanteNombre || ''
        : match?.equipoLocalNombre || '',
      esLocal,
      golesClub,
      golesRival,
      dtNombre,
      dtCI,
      dtFirma,
      capitanCarne,
      roster: [
        ...titulares.map((p) => ({ ...p, esTitular: true })),
        ...suplentes.map((p) => ({ ...p, esTitular: false })),
      ],
      events,
      observaciones,
      submittedBy: teamId,
      submittedAt: null,
      updatedAt: new Date().toISOString(),
    };
  }, [matchId, teamId, teamName, status, esLocal, match, golesClub, golesRival, dtNombre, dtCI, dtFirma, capitanCarne, titulares, suplentes, events, observaciones]);

  async function saveDraft() {
    setSaving(true);
    try {
      const submission = buildSubmission();
      submission.status = 'draft';
      const res = await fetch('/api/planilla/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submission),
      });
      const data = await res.json();
      if (data.issues) setIssues(data.issues);
      setLastSaved(new Date().toLocaleTimeString('es-UY'));
    } catch { /* ignore */ }
    setSaving(false);
  }

  async function submitPlanilla() {
    setSubmitting(true);
    try {
      // First save
      const submission = buildSubmission();
      submission.status = 'draft';
      await fetch('/api/planilla/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submission),
      });

      // Then submit
      const res = await fetch(`/api/planilla/submissions?matchId=${matchId}`, {
        method: 'PUT',
      });
      const data = await res.json();
      if (res.ok) {
        setStatus('submitted');
        setConfirmSubmit(false);
      } else {
        alert(data.error || 'Error al enviar');
      }
    } catch {
      alert('Error de conexión');
    }
    setSubmitting(false);
  }

  // Auto-save every 30 seconds
  useEffect(() => {
    if (status === 'submitted' || !teamId) return;
    const interval = setInterval(() => {
      saveDraft();
    }, 30000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, teamId, buildSubmission]);

  const inputClass =
    'bg-[#0a0f1a] border border-[#2d3a4f] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-liga-blue transition-colors';

  if (!match) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="text-gray-400">Cargando partido...</div>
      </div>
    );
  }

  const isReadOnly = status === 'submitted';

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-20">
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.push('/planilla')}
          className="text-gray-400 hover:text-white text-sm transition-colors"
        >
          &larr; Mis Partidos
        </button>
        <div className="flex items-center gap-3">
          <SubmissionStatus status={status} />
          {lastSaved && (
            <span className="text-xs text-gray-500">Guardado: {lastSaved}</span>
          )}
        </div>
      </div>

      <MatchHeader match={match} />

      {isReadOnly && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 text-green-400 text-sm">
          Esta planilla ya fue enviada. No se puede editar.
        </div>
      )}

      {/* Team info */}
      <div className="bg-liga-card border border-liga-border rounded-xl p-4 sm:p-6">
        <h3 className="text-lg font-semibold text-white mb-4">
          Planilla de {teamName}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Director Técnico</label>
            <input
              type="text"
              value={dtNombre}
              onChange={(e) => setDtNombre(e.target.value)}
              className={`${inputClass} w-full`}
              placeholder="Nombre del DT"
              disabled={isReadOnly}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">CI del DT</label>
            <input
              type="text"
              value={dtCI}
              onChange={(e) => setDtCI(e.target.value)}
              className={`${inputClass} w-full`}
              placeholder="Cédula de identidad"
              disabled={isReadOnly}
            />
          </div>
        </div>
        <label className="flex items-center gap-2 mt-3 text-sm text-gray-400 cursor-pointer">
          <input
            type="checkbox"
            checked={dtFirma}
            onChange={(e) => setDtFirma(e.target.checked)}
            disabled={isReadOnly}
            className="rounded border-[#2d3a4f] bg-[#0a0f1a] text-liga-blue focus:ring-liga-blue"
          />
          Firma del DT
        </label>
      </div>

      {/* Titulares */}
      {!isReadOnly ? (
        <RosterForm
          title="Titulares"
          esTitular={true}
          players={titulares}
          availablePlayers={teamPlayers}
          onChange={setTitulares}
          capitanCarne={capitanCarne}
          onCapitanChange={setCapitanCarne}
          matchId={matchId}
          teamId={teamId}
        />
      ) : (
        <ReadOnlyRoster title="Titulares" players={titulares} capitanCarne={capitanCarne} />
      )}

      {/* Suplentes */}
      {!isReadOnly ? (
        <RosterForm
          title="Suplentes"
          esTitular={false}
          players={suplentes}
          availablePlayers={teamPlayers}
          onChange={setSuplentes}
          matchId={matchId}
          teamId={teamId}
        />
      ) : (
        <ReadOnlyRoster title="Suplentes" players={suplentes} />
      )}

      {/* Events */}
      {!isReadOnly ? (
        <EventForm
          events={events}
          roster={[...titulares, ...suplentes]}
          onChange={setEvents}
        />
      ) : (
        <ReadOnlyEvents events={events} />
      )}

      {/* Result */}
      <div className="bg-liga-card border border-liga-border rounded-xl p-4 sm:p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Resultado</h3>
        <div className="flex items-center gap-4 justify-center">
          <div className="text-center">
            <div className="text-sm text-gray-400 mb-2">{teamName}</div>
            <input
              type="number"
              value={golesClub}
              onChange={(e) => setGolesClub(parseInt(e.target.value) || 0)}
              min={0}
              className={`${inputClass} w-20 text-center text-2xl font-bold`}
              disabled={isReadOnly}
            />
          </div>
          <span className="text-gray-500 text-2xl mt-6">-</span>
          <div className="text-center">
            <div className="text-sm text-gray-400 mb-2">
              {esLocal ? match.equipoVisitanteNombre : match.equipoLocalNombre}
            </div>
            <input
              type="number"
              value={golesRival}
              onChange={(e) => setGolesRival(parseInt(e.target.value) || 0)}
              min={0}
              className={`${inputClass} w-20 text-center text-2xl font-bold`}
              disabled={isReadOnly}
            />
          </div>
        </div>
      </div>

      {/* Observaciones */}
      <div className="bg-liga-card border border-liga-border rounded-xl p-4 sm:p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Observaciones</h3>
        <textarea
          value={observaciones}
          onChange={(e) => setObservaciones(e.target.value)}
          className={`${inputClass} w-full h-24 resize-none`}
          placeholder="Observaciones opcionales..."
          disabled={isReadOnly}
        />
      </div>

      {/* Validation issues */}
      {issues.length > 0 && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
          <h4 className="text-yellow-400 font-medium mb-2">Advertencias</h4>
          <ul className="space-y-1">
            {issues.map((issue, i) => (
              <li key={i} className="text-sm text-yellow-300/80">
                {issue.severity === 'error' ? '⚠' : '•'} {issue.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Actions */}
      {!isReadOnly && (
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={saveDraft}
            disabled={saving}
            className="flex-1 py-3 rounded-lg font-medium transition-colors border border-[#2d3a4f] text-gray-300 hover:text-white hover:border-liga-blue disabled:opacity-50"
          >
            {saving ? 'Guardando...' : 'Guardar borrador'}
          </button>
          <button
            type="button"
            onClick={() => setConfirmSubmit(true)}
            className="flex-1 py-3 rounded-lg font-medium transition-colors bg-liga-blue text-white hover:bg-liga-blue/80"
          >
            Enviar planilla
          </button>
        </div>
      )}

      {/* Submit confirmation modal */}
      {confirmSubmit && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-liga-card border border-liga-border rounded-2xl p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-white mb-2">
              Confirmar envío
            </h3>
            <p className="text-gray-400 text-sm mb-6">
              Una vez enviada, no podrás editar la planilla. ¿Estás seguro?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmSubmit(false)}
                className="flex-1 py-2.5 rounded-lg border border-[#2d3a4f] text-gray-300 hover:text-white transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={submitPlanilla}
                disabled={submitting}
                className="flex-1 py-2.5 rounded-lg bg-liga-blue text-white font-medium hover:bg-liga-blue/80 disabled:opacity-50 transition-colors"
              >
                {submitting ? 'Enviando...' : 'Confirmar envío'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Read-only components for submitted state ───────────

function ReadOnlyRoster({
  title,
  players,
  capitanCarne,
}: {
  title: string;
  players: RosterPlayer[];
  capitanCarne?: string;
}) {
  return (
    <div className="bg-liga-card border border-liga-border rounded-xl p-4 sm:p-6">
      <h3 className="text-lg font-semibold text-white mb-4">{title}</h3>
      <div className="space-y-2">
        {players.map((p, i) => (
          <div key={i} className="flex items-center gap-3 p-2.5 bg-[#0a0f1a]/50 rounded-lg text-sm">
            {p.fotoFilename && (
              <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-green-500/40 shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/planilla/photos?filename=${encodeURIComponent(p.fotoFilename)}`}
                  alt={p.nombre}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <span className="text-gray-500 w-8 text-right">#{p.camiseta}</span>
            <span className="text-white flex-1">{p.nombre}</span>
            <span className="text-gray-500">{p.carne}</span>
            {capitanCarne === p.carne && (
              <span className="text-xs px-2 py-0.5 bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 rounded-md">
                C
              </span>
            )}
            {p.fotoFilename ? (
              <span className="text-green-400 text-xs">Firmado</span>
            ) : p.firma ? (
              <span className="text-green-400/60 text-xs">Firma</span>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function ReadOnlyEvents({ events }: { events: MatchEvent[] }) {
  const typeLabels: Record<string, string> = {
    gol: 'Gol',
    amarilla: 'Amarilla',
    roja: 'Roja',
    cambio: 'Cambio',
  };
  const typeColors: Record<string, string> = {
    gol: 'text-green-400',
    amarilla: 'text-yellow-400',
    roja: 'text-red-400',
    cambio: 'text-blue-400',
  };

  return (
    <div className="bg-liga-card border border-liga-border rounded-xl p-4 sm:p-6">
      <h3 className="text-lg font-semibold text-white mb-4">Eventos</h3>
      {events.length === 0 ? (
        <p className="text-gray-500 text-sm">No hay eventos registrados</p>
      ) : (
        <div className="space-y-2">
          {events.map((e) => (
            <div key={e.id} className="flex items-center gap-3 p-2.5 bg-[#0a0f1a]/50 rounded-lg text-sm">
              <span className="text-gray-500 font-mono w-10 text-right">{e.minuto}&apos;</span>
              <span className={`w-16 text-xs font-medium ${typeColors[e.type]}`}>
                {typeLabels[e.type]}
              </span>
              <span className="text-white flex-1">
                {e.type === 'cambio'
                  ? `Sale ${e.jugadorSaleNombre} → Entra ${e.jugadorEntraNombre}`
                  : `${e.jugadorNombre}${e.enContra ? ' (e/c)' : ''}`}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
