import {
  loadCachedData,
  loadMetrics,
  setMemoryCache,
  getMemoryCache,
  saveMetrics,
} from './storage';
import { computeAllMetrics } from './metrics';
import { ingestAll } from './ingest';
import type { ComputedMetrics, CachedData } from './types';

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

export function getData(): { data: CachedData | null; metrics: ComputedMetrics | null } {
  return getMemoryCache();
}

async function tryLoadFromDisk(): Promise<boolean> {
  progress.status = 'loading_cache';
  progress.message = 'Cargando datos desde cache en disco...';

  const data = await loadCachedData();
  if (!data || data.rows.length === 0) return false;

  let metrics = await loadMetrics();
  if (!metrics) {
    progress.message = 'Recalculando métricas...';
    metrics = computeAllMetrics(data);
    await saveMetrics(metrics);
  }

  setMemoryCache(data, metrics);
  progress.status = 'ready';
  progress.message = `Datos cargados: ${data.rows.length} filas, ${metrics.allTeams.length} equipos, ${metrics.allTemporadas.length} temporadas. Cache del ${new Date(data.fetchedAt).toLocaleString('es-UY')}.`;
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
    progress.message = `Ingesta completa: ${data.rows.length} filas. ${new Date().toLocaleString('es-UY')}.`;
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
