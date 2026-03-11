import { loadMatch, loadValidation, loadBothSubmissions } from '@/lib/planilla/storage';
import { notFound } from 'next/navigation';
import type { RosterPlayer, MatchEvent } from '@/lib/planilla/types';

interface Props {
  params: { matchId: string };
}

export default async function ResumenPartidoPage({ params }: Props) {
  const match = await loadMatch(params.matchId);
  if (!match) notFound();

  const validation = await loadValidation(params.matchId);
  if (!validation || (validation.status !== 'validated' && validation.status !== 'published')) {
    return (
      <div className="max-w-4xl mx-auto text-center py-16">
        <h1 className="text-2xl font-bold text-white mb-4">Partido pendiente</h1>
        <p className="text-gray-400">
          Este partido aún no ha sido validado por la Liga.
        </p>
      </div>
    );
  }

  const both = await loadBothSubmissions(params.matchId, match);

  const statusLabel = validation.status === 'published' ? 'Publicado' : 'Validado';
  const statusColor = validation.status === 'published'
    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
    : 'bg-green-500/20 text-green-400 border-green-500/30';

  const fecha = new Date(match.fecha).toLocaleDateString('es-UY', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-liga-card border border-liga-border rounded-xl p-6 text-center">
        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${statusColor} mb-4`}>
          {statusLabel}
        </span>
        <div className="flex items-center justify-center gap-6 mb-4">
          <div className="text-right">
            <p className="text-xl font-bold text-white">{match.equipoLocalNombre}</p>
            <p className="text-xs text-gray-500">Local</p>
          </div>
          <div className="text-center">
            <p className="text-4xl font-bold text-white">
              {validation.officialGolesLocal} - {validation.officialGolesVisitante}
            </p>
          </div>
          <div className="text-left">
            <p className="text-xl font-bold text-white">{match.equipoVisitanteNombre}</p>
            <p className="text-xs text-gray-500">Visitante</p>
          </div>
        </div>
        <div className="flex flex-wrap justify-center gap-3 text-sm text-gray-400">
          <span>{fecha}</span>
          {match.hora && <span>- {match.hora}</span>}
          {match.cancha && <span>- {match.cancha}</span>}
          <span className="text-liga-sky">Div. {match.divisional}</span>
        </div>
      </div>

      {/* Lineups */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <RosterCard
          title={match.equipoLocalNombre}
          titulares={validation.officialRosterLocal.filter((p) => p.esTitular)}
          suplentes={validation.officialRosterLocal.filter((p) => !p.esTitular)}
          capitanCarne={both.local?.capitanCarne}
          dtNombre={both.local?.dtNombre}
        />
        <RosterCard
          title={match.equipoVisitanteNombre}
          titulares={validation.officialRosterVisitante.filter((p) => p.esTitular)}
          suplentes={validation.officialRosterVisitante.filter((p) => !p.esTitular)}
          capitanCarne={both.visitante?.capitanCarne}
          dtNombre={both.visitante?.dtNombre}
        />
      </div>

      {/* Events timeline */}
      {validation.officialEvents.length > 0 && (
        <div className="bg-liga-card border border-liga-border rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Eventos</h3>
          <div className="space-y-2">
            {validation.officialEvents
              .sort((a, b) => a.minuto - b.minuto)
              .map((event) => (
                <EventRow key={event.id} event={event} />
              ))}
          </div>
        </div>
      )}

      {/* Audit info */}
      <div className="text-center text-xs text-gray-500 space-y-1">
        {validation.validatedAt && (
          <p>Validado: {new Date(validation.validatedAt).toLocaleString('es-UY')}</p>
        )}
        {validation.publishedAt && (
          <p>Publicado: {new Date(validation.publishedAt).toLocaleString('es-UY')}</p>
        )}
      </div>
    </div>
  );
}

function RosterCard({
  title,
  titulares,
  suplentes,
  capitanCarne,
  dtNombre,
}: {
  title: string;
  titulares: RosterPlayer[];
  suplentes: RosterPlayer[];
  capitanCarne?: string;
  dtNombre?: string;
}) {
  return (
    <div className="bg-liga-card border border-liga-border rounded-xl p-4">
      <h4 className="text-white font-semibold mb-3">{title}</h4>

      {dtNombre && (
        <p className="text-xs text-gray-500 mb-3">DT: {dtNombre}</p>
      )}

      <div className="mb-3">
        <p className="text-xs text-gray-400 mb-2 font-medium">Titulares</p>
        <div className="space-y-1">
          {titulares.map((p, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
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
                <div className="w-7 shrink-0" />
              )}
              <span className="text-gray-500 w-8 text-right">#{p.camiseta}</span>
              <span className="text-white flex-1">{p.nombre}</span>
              {capitanCarne === p.carne && (
                <span className="text-yellow-400 text-xs font-medium">C</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {suplentes.length > 0 && (
        <div>
          <p className="text-xs text-gray-400 mb-2 font-medium">Suplentes</p>
          <div className="space-y-1">
            {suplentes.map((p, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <span className="text-gray-500 w-8 text-right">#{p.camiseta}</span>
                <span className="text-gray-300 flex-1">{p.nombre}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function EventRow({ event }: { event: MatchEvent }) {
  const typeConfig: Record<string, { label: string; color: string }> = {
    gol: { label: 'Gol', color: 'text-green-400' },
    amarilla: { label: 'Amarilla', color: 'text-yellow-400' },
    roja: { label: 'Roja', color: 'text-red-400' },
    cambio: { label: 'Cambio', color: 'text-blue-400' },
  };

  const cfg = typeConfig[event.type] || { label: event.type, color: 'text-gray-400' };

  let description = event.jugadorNombre;
  if (event.type === 'gol' && event.enContra) description += ' (en contra)';
  if (event.type === 'cambio') {
    description = `${event.jugadorSaleNombre} → ${event.jugadorEntraNombre}`;
  }

  return (
    <div className="flex items-center gap-3 py-2 border-b border-[#1a2435] last:border-0">
      <span className="text-gray-500 font-mono w-10 text-right text-sm">
        {event.minuto}&apos;
      </span>
      <span className={`text-xs font-medium w-16 ${cfg.color}`}>{cfg.label}</span>
      <span className="text-white text-sm">{description}</span>
    </div>
  );
}
