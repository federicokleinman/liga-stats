import type { PlanillaMatch } from '@/lib/planilla/types';
import { SubmissionStatus } from './SubmissionStatus';

interface Props {
  match: PlanillaMatch;
  showStatus?: boolean;
}

export function MatchHeader({ match, showStatus = true }: Props) {
  const fecha = new Date(match.fecha).toLocaleDateString('es-UY', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="bg-liga-card border border-liga-border rounded-xl p-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="text-center sm:text-left">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-xl font-bold text-white">
              {match.equipoLocalNombre}
            </span>
            <span className="text-gray-500 text-lg">vs</span>
            <span className="text-xl font-bold text-white">
              {match.equipoVisitanteNombre}
            </span>
          </div>
          <div className="flex flex-wrap gap-3 text-sm text-gray-400">
            <span>{fecha}</span>
            {match.hora && <span>- {match.hora}</span>}
            {match.cancha && <span>- {match.cancha}</span>}
            <span className="text-liga-sky">Div. {match.divisional}</span>
          </div>
        </div>
        {showStatus && <SubmissionStatus status={match.status} />}
      </div>
    </div>
  );
}
