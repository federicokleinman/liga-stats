import {
  loadCachedData,
  setMemoryCache,
  getMemoryCache,
  saveAllMetrics,
} from './storage';
import { computeAllMetrics } from './metrics';
import { ingestAll } from './ingest';
import type { ComputedMetrics, CachedData } from './types';
import { TORNEO_NAMES } from './types';

export interface IngestProgress {
  status: 'idle' | 'loading_cache' | 'ingesting' | 'ready' | 'error';
  message: string;
  done: number;
  total: number;
  startedAt?: string;
}

const progress: IngestProgress = {
  status: 'idle',
  message: 'Sin inicializar',
  done: 0,
  total: 0,
};

let initPromise: Promise<void> | null = null;

export function getProgress(): IngestProgress {
  return { ...progress };
}

export function isReady(): boolean {
  return progress.status === 'ready';
}

export function getData(): { data: CachedData | null; allMetrics: Record<string, ComputedMetrics> | null } {
  return getMemoryCache();
}

export function getMetricsForTorneo(torneo: string): ComputedMetrics | null {
  const { allMetrics } = getMemoryCache();
  if (!allMetrics) return null;
  return allMetrics[torneo] ?? null;
}

export function getAllTorneos(): string[] {
  const { allMetrics } = getMemoryCache();
  if (!allMetrics) return [];
  return Object.keys(allMetrics);
}

async function tryLoadFromDisk(): Promise<boolean> {
  progress.status = 'loading_cache';
  progress.message = 'Cargando datos desde cache en disco...';

  const data = await loadCachedData();
  if (!data || data.rows.length === 0) return false;

  // Always recompute metrics from standings to ensure they stay in sync
  // (loading a stale metrics.json after standings.json was patched caused wrong champions).
  progress.message = 'Recalculando métricas...';
  const allMetrics: Record<string, ComputedMetrics> = {};
  const torneos = data.torneos?.length ? data.torneos : [TORNEO_NAMES.MAYORES];
  for (const torneo of torneos) {
    allMetrics[torneo] = computeAllMetrics(data, torneo);
  }
  await saveAllMetrics(allMetrics);

  setMemoryCache(data, allMetrics);
  progress.status = 'ready';
  const torneoCount = Object.keys(allMetrics).length;
  const teamCount = Object.values(allMetrics).reduce((sum, m) => sum + m.allTeams.length, 0);
  progress.message = `Datos cargados: ${data.rows.length} filas, ${torneoCount} categorías, ~${teamCount} equipos. Cache del ${new Date(data.fetchedAt).toLocaleString('es-UY')}.`;
  return true;
}

async function runIngestion(): Promise<void> {
  progress.status = 'ingesting';
  progress.message = 'Iniciando ingesta de datos...';
  progress.done = 0;
  progress.total = 0;
  progress.startedAt = new Date().toISOString();

  try {
    const data = await ingestAll((done, total, msg) => {
      progress.done = done;
      progress.total = total;
      progress.message = msg;
    });

    progress.status = 'ready';
    progress.message = `Ingesta completa: ${data.rows.length} filas, ${data.torneos.length} categorías. ${new Date().toLocaleString('es-UY')}.`;
    progress.done = progress.total;
  } catch (err) {
    progress.status = 'error';
    progress.message = `Error en ingesta: ${err instanceof Error ? err.message : 'desconocido'}`;
  }
}

export async function ensureInitialized(): Promise<void> {
  if (progress.status === 'ready') return;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const loaded = await tryLoadFromDisk();
    if (!loaded) {
      await runIngestion();
    }
  })();

  return initPromise;
}

export async function forceRefresh(): Promise<void> {
  if (progress.status === 'ingesting') {
    throw new Error('Ya hay una ingesta en curso');
  }
  initPromise = runIngestion();
  return initPromise;
}
