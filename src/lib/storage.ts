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
    const data = JSON.parse(raw) as CachedData;
    // Validate schema compatibility: require torneo field on rows
    if (!data.torneos || !data.rows[0]?.torneo) return null;
    return data;
  } catch {
    return null;
  }
}

export async function saveCachedData(data: CachedData): Promise<void> {
  await ensureCacheDir();
  await writeFile(STANDINGS_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

export async function loadAllMetrics(): Promise<Record<string, ComputedMetrics> | null> {
  try {
    await ensureCacheDir();
    if (!existsSync(METRICS_FILE)) return null;
    const raw = await readFile(METRICS_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    // Validate: must be an object with torneo keys, not a single ComputedMetrics
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
    if (parsed.topChampions) return null; // old single-torneo format
    return parsed as Record<string, ComputedMetrics>;
  } catch {
    return null;
  }
}

export async function saveAllMetrics(allMetrics: Record<string, ComputedMetrics>): Promise<void> {
  await ensureCacheDir();
  await writeFile(METRICS_FILE, JSON.stringify(allMetrics, null, 2), 'utf-8');
}

let memoryCache: { data: CachedData | null; allMetrics: Record<string, ComputedMetrics> | null } = {
  data: null,
  allMetrics: null,
};

export function getMemoryCache() {
  return memoryCache;
}

export function setMemoryCache(data: CachedData | null, allMetrics: Record<string, ComputedMetrics> | null) {
  memoryCache = { data, allMetrics };
}
