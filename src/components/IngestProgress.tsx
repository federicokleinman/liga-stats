'use client';

interface Props {
  status: string;
  message: string;
  done: number;
  total: number;
}

export function IngestProgress({ status, message, done, total }: Props) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const isIngesting = status === 'ingesting';
  const isLoadingCache = status === 'loading_cache';

  return (
    <div className="bg-[#111827] border border-blue-500/30 rounded-xl p-8 max-w-xl mx-auto">
      <div className="text-center mb-6">
        <div className="animate-spin h-10 w-10 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
        <h2 className="text-xl font-bold text-white">
          {isLoadingCache ? 'Cargando datos...' : 'Descargando datos de la Liga'}
        </h2>
        <p className="text-gray-400 mt-1 text-sm">
          {isLoadingCache
            ? 'Leyendo cache del disco...'
            : 'Primera ejecución — descargando posiciones históricas. Esto solo ocurre una vez.'}
        </p>
      </div>

      {isIngesting && total > 0 && (
        <div className="space-y-3">
          <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
            <div
              className="bg-blue-500 h-3 rounded-full transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="flex justify-between text-sm text-gray-400">
            <span>{done} / {total}</span>
            <span>{pct}%</span>
          </div>
        </div>
      )}

      <p className="text-sm text-gray-500 mt-4 text-center truncate" title={message}>
        {message}
      </p>
    </div>
  );
}
