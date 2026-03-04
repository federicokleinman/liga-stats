'use client';

import { ALL_TORNEOS, TORNEO_DISPLAY } from '@/lib/types';
import { useTorneo } from '@/lib/hooks';

export function TorneoSelector() {
  const [torneo, setTorneo] = useTorneo();

  return (
    <div className="flex flex-wrap gap-2">
      {ALL_TORNEOS.map((t) => (
        <button
          key={t}
          onClick={() => setTorneo(t)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            torneo === t
              ? 'bg-blue-600 text-white'
              : 'bg-[#1e293b] text-gray-300 hover:text-white hover:bg-gray-700'
          }`}
        >
          {TORNEO_DISPLAY[t] ?? t}
        </button>
      ))}
    </div>
  );
}
