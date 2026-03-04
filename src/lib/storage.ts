import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import type { CachedData, ComputedMetrics } from './types';

const CACHE_DIR = path.join(process.cwd(), '.cache');
const STANDINGS_FILE = path.join(CACHE_DIR, 'standings.json');
const METRICS_FILE = path.join(CACHE_DIR, 'metrics.json');

async function ensureCacheDir() {
  if (!existsSync(CACHE_DIR)) {
    await mkdir(CACHE_DIR, { recursive: true });
  }
}

export async function loadCachedData(): Promise<CachedData | null> {
  try {
    await ensureCacheDir();
    if (!existsSync(STANDINGS_FILE)) return null;
    const raw = await readFile(STANDINGS_FILE, 'utf-8');
    return JSON.parse(raw) as CachedData;
  } catch {
    return null;
  }
}

export async function saveCachedData(data: CachedData): Promise<void> {
  await ensureCacheDir();
  await writeFile(STANDINGS_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

export async function loadMetrics(): Promise<ComputedMetrics | null> {
  try {
    await ensureCacheDir();
    if (!existsSync(METRICS_FILE)) return null;
    const raw = await readFile(METRICS_FILE, 'utf-8');
    return JSON.parse(raw) as ComputedMetrics;
  } catch {
    return null;
  }
}

export async function saveMetrics(metrics: ComputedMetrics): Promise<void> {
  await ensureCacheDir();
  await writeFile(METRICS_FILE, JSON.stringify(metrics, null, 2), 'utf-8');
}

let memoryCache: { data: CachedData | null; metrics: ComputedMetrics | null } = {
  data: null,
  metrics: null,
};

export function getMemoryCache() {
  return memoryCache;
}

export function setMemoryCache(data: CachedData | null, metrics: ComputedMetrics | null) {
  memoryCache = { data, metrics };
}
