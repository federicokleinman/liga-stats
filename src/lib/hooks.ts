'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { ComputedMetrics, TeamSummary, StandingRow } from './types';

export interface IngestProgress {
  status: 'idle' | 'loading_cache' | 'ingesting' | 'ready' | 'error';
  message: string;
  done: number;
  total: number;
}

export function useMetrics() {
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
    try {
      const res = await fetch('/api/data?view=metrics');

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
                const dataRes = await fetch('/api/data?view=metrics');
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

      const data = await res.json();
      setMetrics(data);
      setProgress(null);
      stopPolling();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error fetching metrics');
    } finally {
      setLoading(false);
    }
  }, [stopPolling]);

  useEffect(() => {
    fetchMetrics();
    return stopPolling;
  }, [fetchMetrics, stopPolling]);

  return { metrics, loading, error, progress, refetch: fetchMetrics };
}

export function useTeam(teamId: string) {
  const [team, setTeam] = useState<TeamSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/data?view=team&teamId=${encodeURIComponent(teamId)}`);
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
  }, [teamId]);

  return { team, loading, error };
}

export function useStandings(temporada: number | null, divisional: string | null) {
  const [rows, setRows] = useState<StandingRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!temporada) return;
    setLoading(true);
    const params = new URLSearchParams({ view: 'standings', temporada: String(temporada) });
    if (divisional) params.set('divisional', divisional);
    fetch(`/api/data?${params}`)
      .then((r) => {
        if (r.status === 202) return { rows: [] };
        return r.json();
      })
      .then((d) => setRows(d.rows || []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [temporada, divisional]);

  return { rows, loading };
}
