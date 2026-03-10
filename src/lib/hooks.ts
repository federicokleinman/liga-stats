'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import type { ComputedMetrics, TeamSummary, StandingRow, PredictionOutput } from './types';
import { TORNEO_NAMES } from './types';

export interface IngestProgress {
  status: 'idle' | 'loading_cache' | 'ingesting' | 'ready' | 'error';
  message: string;
  done: number;
  total: number;
}

export function useTorneo(): [string, (t: string) => void] {
  // TODO: re-enable torneo switching when multi-category UX is redesigned
  const torneo = TORNEO_NAMES.MAYORES;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const setTorneo = useCallback((_t: string) => {}, []);
  return [torneo, setTorneo];

  /* Original implementation:
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const torneo = searchParams.get('torneo') || TORNEO_NAMES.MAYORES;

  const setTorneo = useCallback((t: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('torneo', t);
    router.push(`${pathname}?${params.toString()}`);
  }, [searchParams, router, pathname]);

  return [torneo, setTorneo];
  */
}

export function useMetrics(torneo?: string) {
  const [metrics, setMetrics] = useState<ComputedMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState<IngestProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  const fetchMetrics = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({ view: 'metrics' });
    if (torneo) params.set('torneo', torneo);

    try {
      const res = await fetch(`/api/data?${params}`);

      if (res.status === 202) {
        const body = await res.json();
        setProgress(body.progress);
        setMetrics(null);
        setLoading(false);

        if (!pollingRef.current) {
          pollingRef.current = setInterval(async () => {
            try {
              const pollRes = await fetch('/api/data?view=progress');
              const prog: IngestProgress = await pollRes.json();
              setProgress(prog);

              if (prog.status === 'ready') {
                stopPolling();
                const dataRes = await fetch(`/api/data?${params}`);
                if (dataRes.ok) {
                  setMetrics(await dataRes.json());
                  setProgress(null);
                }
              } else if (prog.status === 'error') {
                stopPolling();
                setError(prog.message);
              }
            } catch {
              // keep polling
            }
          }, 2000);
        }
        return;
      }

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error || `HTTP ${res.status}`);
        setMetrics(null);
        return;
      }

      setMetrics(await res.json());
      setProgress(null);
      stopPolling();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error fetching metrics');
    } finally {
      setLoading(false);
    }
  }, [torneo, stopPolling]);

  useEffect(() => {
    fetchMetrics();
    return stopPolling;
  }, [fetchMetrics, stopPolling]);

  return { metrics, loading, error, progress, refetch: fetchMetrics };
}

export function useTeam(teamId: string, torneo?: string) {
  const [team, setTeam] = useState<TeamSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const params = new URLSearchParams({ view: 'team', teamId });
      if (torneo) params.set('torneo', torneo);
      try {
        const res = await fetch(`/api/data?${params}`);
        if (res.status === 202) {
          setError('Los datos se están cargando. Volvé en unos momentos.');
          return;
        }
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          setError(body.error || `HTTP ${res.status}`);
          return;
        }
        setTeam(await res.json());
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [teamId, torneo]);

  return { team, loading, error };
}

export function useStandings(temporada: number | null, divisional: string | null, torneo?: string) {
  const [rows, setRows] = useState<StandingRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!temporada) return;
    setLoading(true);
    const params = new URLSearchParams({ view: 'standings', temporada: String(temporada) });
    if (divisional) params.set('divisional', divisional);
    if (torneo) params.set('torneo', torneo);
    fetch(`/api/data?${params}`)
      .then((r) => {
        if (r.status === 202) return { rows: [] };
        return r.json();
      })
      .then((d) => setRows(d.rows || []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [temporada, divisional, torneo]);

  return { rows, loading };
}

export function usePredictions() {
  const [predictions, setPredictions] = useState<PredictionOutput | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await fetch('/api/data?view=predictions');
        if (res.status === 202) {
          setError('Los datos se están cargando. Volvé en unos momentos.');
          return;
        }
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          setError(body.error || `HTTP ${res.status}`);
          return;
        }
        setPredictions(await res.json());
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return { predictions, loading, error };
}
