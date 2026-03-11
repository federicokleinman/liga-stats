import type { MatchStatus, SubmissionStatus as SubStatus } from '@/lib/planilla/types';

const matchStatusConfig: Record<MatchStatus, { label: string; color: string }> = {
  pending: { label: 'Pendiente', color: 'bg-gray-500/20 text-gray-400 border-gray-500/30' },
  submitted_one: { label: 'Un equipo envió', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  submitted_both: { label: 'Ambos enviaron', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  validated: { label: 'Validado', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
  published: { label: 'Publicado', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
};

const submissionStatusConfig: Record<SubStatus, { label: string; color: string }> = {
  draft: { label: 'Borrador', color: 'bg-gray-500/20 text-gray-400 border-gray-500/30' },
  submitted: { label: 'Enviada', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
};

export function SubmissionStatus({ status }: { status: MatchStatus | SubStatus }) {
  const config =
    status in matchStatusConfig
      ? matchStatusConfig[status as MatchStatus]
      : submissionStatusConfig[status as SubStatus];

  if (!config) return null;

  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${config.color}`}>
      {config.label}
    </span>
  );
}
