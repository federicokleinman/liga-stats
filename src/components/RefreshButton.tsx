'use client';

import { useState } from 'react';

export function RefreshButton({ onDone }: { onDone?: () => void }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  async function handleRefresh() {
    setLoading(true);
    setMessage('Iniciando re-ingesta...');
    try {
      const res = await fetch('/api/ingest', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setMessage('Ingesta iniciada. Se actualiza en background...');
        onDone?.();
      } else {
        setMessage(`Error: ${data.error || data.message}`);
      }
    } catch (err) {
      setMessage(`Error de red: ${err instanceof Error ? err.message : 'desconocido'}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-4">
      <button
        onClick={handleRefresh}
        disabled={loading}
        className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:cursor-not-allowed text-gray-200 rounded-lg font-medium text-sm transition-colors border border-gray-600"
      >
        {loading ? 'Iniciando...' : 'Re-ingestar datos'}
      </button>
      {message && <span className="text-sm text-gray-400">{message}</span>}
    </div>
  );
}
