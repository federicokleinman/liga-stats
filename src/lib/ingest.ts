import type { StandingRow, CachedData } from './types';
import { normalizeName, resetAliasCache } from './normalize';
import { saveCachedData, setMemoryCache, saveMetrics } from './storage';
import { computeAllMetrics } from './metrics';

const API_BASE = 'https://ligauniversitaria.org.uy/detallefechas/api.php';
const RATE_LIMIT_MS = 350;
let lastRequestTime = 0;

async function rateLimitedFetch(url: string): Promise<Response> {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < RATE_LIMIT_MS) {
    await new Promise((r) => setTimeout(r, RATE_LIMIT_MS - elapsed));
  }
  lastRequestTime = Date.now();
  return fetch(url, {
    headers: { Accept: 'application/json, text/html, */*' },
    signal: AbortSignal.timeout(15000),
  });
}

async function directFetch(url: string): Promise<Response> {
  return fetch(url, {
    headers: { Accept: 'application/json, text/html, */*' },
    signal: AbortSignal.timeout(15000),
  });
}

async function fetchAllPartidosBatch(temporada: string, serie: string, fechas: string[]): Promise<RawMatch[]> {
  const all: RawMatch[] = [];
  const CONCURRENCY = 4;
  for (let i = 0; i < fechas.length; i += CONCURRENCY) {
    const batch = fechas.slice(i, i + CONCURRENCY);
    const results = await Promise.all(
      batch.map(async (f, idx) => {
        await new Promise((r) => setTimeout(r, idx * 150));
        const url = buildUrl({
          action: 'cargarPartidos',
          temporada,
          deporte: 'FÚTBOL',
          torneo: 'Mayores Masculino',
          serie,
          fecha: f,
        });
        try {
          const res = await directFetch(url);
          if (!res.ok) return [];
          const text = await res.text();
          const d = JSON.parse(text) as RawMatch[];
          return Array.isArray(d) ? d : [];
        } catch { return []; }
      })
    );
    for (const r of results) all.push(...r);
    if (i + CONCURRENCY < fechas.length) await new Promise((r) => setTimeout(r, 300));
  }
  return all;
}

function buildUrl(params: Record<string, string>): string {
  const qs = new URLSearchParams(params).toString();
  return `${API_BASE}?${qs}`;
}

async function fetchJson<T>(params: Record<string, string>): Promise<T | null> {
  try {
    const res = await rateLimitedFetch(buildUrl(params));
    if (!res.ok) return null;
    const text = await res.text();
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

// ── API cascade helpers ────────────────────────────────────────────

async function fetchTemporadas(): Promise<string[]> {
  const d = await fetchJson<{ codigo: string }[]>({ action: 'cargarTemporadas' });
  return d && Array.isArray(d) ? d.map((t) => t.codigo) : [];
}

async function fetchSeries(temporada: string): Promise<string[]> {
  const d = await fetchJson<{ nombre: string }[]>({
    action: 'cargarSeries',
    temporada,
    deporte: 'FÚTBOL',
    torneo: 'Mayores Masculino',
  });
  return d && Array.isArray(d) ? d.map((s) => s.nombre) : [];
}

async function fetchFechas(temporada: string, serie: string): Promise<string[]> {
  const d = await fetchJson<{ fecha: string }[]>({
    action: 'cargarFechas',
    temporada,
    deporte: 'FÚTBOL',
    torneo: 'Mayores Masculino',
    serie,
  });
  return d && Array.isArray(d) ? d.map((f) => f.fecha) : [];
}

interface RawMatch {
  Locatario: string;
  Visitante: string;
  GL: string;
  GV: string;
  Fecha: string;
  Cancha?: string;
  ID?: string;
  Fecha_Hora?: string;
}

// ── Serie classification ───────────────────────────────────────────

function extractDivisionalLetter(serieName: string): string {
  const m = serieName.match(/(?:DIVISIONAL|DIV\.?|CLASIFICATORIO)\s*"?\s*([A-I])\s*"?/i);
  if (m) return m[1].toUpperCase();
  const simple = serieName.match(/^([A-I])-$/i);
  if (simple) return simple[1].toUpperCase();
  return '';
}

function shouldIncludeSerie(serieName: string): boolean {
  const letter = extractDivisionalLetter(serieName);
  if (!letter) return false;
  const skip = [/DESEMPATE/i, /VICECAMPEONATO/i, /FINAL\b/i];
  return !skip.some((p) => p.test(serieName));
}

function getSerieWeight(name: string): number {
  const u = name.toUpperCase();
  if (/PERMANENCIA|PER\./i.test(u)) return 5;
  if (/COPA|PLATA/i.test(u)) return 4;
  if (/CAMPEON\b/i.test(u)) return 3;
  if (/TITULO|TIT\.|ASCENSO|ASC\./i.test(u)) return 2;
  if (/SERIE/i.test(u)) return 6;
  return 0; // principal
}

// ── Build standings from matches ───────────────────────────────────

interface TeamStats {
  name: string;
  pj: number;
  pg: number;
  pe: number;
  pp: number;
  gf: number;
  gc: number;
}

function buildStandings(matches: RawMatch[]): TeamStats[] {
  const map = new Map<string, TeamStats>();

  const ensure = (name: string) => {
    if (!map.has(name)) map.set(name, { name, pj: 0, pg: 0, pe: 0, pp: 0, gf: 0, gc: 0 });
    return map.get(name)!;
  };

  for (const m of matches) {
    const gl = parseInt(m.GL, 10);
    const gv = parseInt(m.GV, 10);
    if (isNaN(gl) || isNaN(gv)) continue;

    const home = ensure(m.Locatario.trim());
    const away = ensure(m.Visitante.trim());

    home.pj++;
    away.pj++;
    home.gf += gl;
    home.gc += gv;
    away.gf += gv;
    away.gc += gl;

    if (gl > gv) {
      home.pg++;
      away.pp++;
    } else if (gl < gv) {
      away.pg++;
      home.pp++;
    } else {
      home.pe++;
      away.pe++;
    }
  }

  const rows = Array.from(map.values());
  // Standard: 3 pts per win, 1 per draw
  rows.sort((a, b) => {
    const ptsA = a.pg * 3 + a.pe;
    const ptsB = b.pg * 3 + b.pe;
    if (ptsB !== ptsA) return ptsB - ptsA;
    const difA = a.gf - a.gc;
    const difB = b.gf - b.gc;
    if (difB !== difA) return difB - difA;
    return b.gf - a.gf;
  });

  return rows;
}

// ── Main ingestion ─────────────────────────────────────────────────

export type ProgressCallback = (done: number, total: number, msg: string) => void;

export async function ingestAll(onProgress?: ProgressCallback): Promise<CachedData> {
  resetAliasCache();

  onProgress?.(0, 0, 'Cargando lista de temporadas...');
  const allTemporadas = await fetchTemporadas();
  if (allTemporadas.length === 0) throw new Error('No se pudieron obtener las temporadas');

  const temporadaMin = parseInt(process.env.TEMPORADA_MIN || '0', 10);
  const temporadaMax = parseInt(process.env.TEMPORADA_MAX || '9999', 10);
  const temporadas = allTemporadas
    .filter((t) => { const n = parseInt(t, 10); return !isNaN(n) && n >= temporadaMin && n <= temporadaMax; })
    .sort((a, b) => parseInt(a) - parseInt(b));

  onProgress?.(0, temporadas.length, `${temporadas.length} temporadas a procesar`);

  // Phase 1 — discover series per temporada
  type Combo = { temporada: string; serie: string; letra: string; weight: number };
  const allCombos: Combo[] = [];
  for (let i = 0; i < temporadas.length; i++) {
    const t = temporadas[i];
    onProgress?.(i + 1, temporadas.length, `T${t}: descubriendo series...`);
    const series = await fetchSeries(t);
    for (const s of series) {
      if (shouldIncludeSerie(s)) {
        const letra = extractDivisionalLetter(s);
        if (letra) allCombos.push({ temporada: t, serie: s, letra, weight: getSerieWeight(s) });
      }
    }
  }

  // Deduplicate: prefer principal (weight 0) per temporada+letra
  const best = new Map<string, Combo>();
  for (const c of allCombos) {
    const k = `${c.temporada}|${c.letra}`;
    const ex = best.get(k);
    if (!ex || c.weight < ex.weight) best.set(k, c);
  }
  const combos = Array.from(best.values());

  // Phase 2 — fetch matches for all combos with controlled concurrency
  const allRows: StandingRow[] = [];
  const divisionalSet = new Set<string>();
  let done = 0;
  const total = combos.length;
  const COMBO_CONCURRENCY = 3;

  onProgress?.(0, total, `${total} divisionales a descargar`);

  async function processCombo(combo: Combo): Promise<StandingRow[]> {
    const { temporada, serie, letra } = combo;
    const tempNum = parseInt(temporada, 10);

    const fechas = await fetchFechas(temporada, serie);
    if (fechas.length === 0) return [];

    const allMatches = await fetchAllPartidosBatch(temporada, serie, fechas);
    if (allMatches.length === 0) return [];

    const standings = buildStandings(allMatches);
    const rows: StandingRow[] = [];
    for (let pos = 0; pos < standings.length; pos++) {
      const s = standings[pos];
      const { normalized, teamId } = await normalizeName(s.name);
      const puntos = s.pg * 3 + s.pe;
      rows.push({
        temporadaId: tempNum,
        divisionalLetra: letra,
        equipoNombre: s.name,
        equipoNombreNormalizado: normalized,
        teamId,
        posicion: pos + 1,
        pj: s.pj, pg: s.pg, pe: s.pe, pp: s.pp,
        gf: s.gf, gc: s.gc,
        puntos,
        diferencia: s.gf - s.gc,
        extras: { matchesPlayed: allMatches.length, fechas: fechas.length, serieOriginal: serie },
      });
    }
    return rows;
  }

  for (let i = 0; i < combos.length; i += COMBO_CONCURRENCY) {
    const batch = combos.slice(i, i + COMBO_CONCURRENCY);
    const results = await Promise.allSettled(
      batch.map(async (combo) => {
        divisionalSet.add(combo.letra);
        try {
          const rows = await processCombo(combo);
          done++;
          const msg = rows.length > 0
            ? `T${combo.temporada} Div${combo.letra}: ${rows.length} equipos`
            : `T${combo.temporada} Div${combo.letra}: sin datos`;
          onProgress?.(done, total, msg);
          return rows;
        } catch {
          done++;
          onProgress?.(done, total, `T${combo.temporada} Div${combo.letra}: error`);
          return [];
        }
      })
    );
    for (const r of results) {
      if (r.status === 'fulfilled') allRows.push(...r.value);
    }
  }

  const cached: CachedData = {
    rows: allRows,
    fetchedAt: new Date().toISOString(),
    temporadaMin: Math.min(...temporadas.map(Number)),
    temporadaMax: Math.max(...temporadas.map(Number)),
    divisionales: Array.from(divisionalSet).sort(),
  };

  await saveCachedData(cached);
  const metrics = computeAllMetrics(cached);
  await saveMetrics(metrics);
  setMemoryCache(cached, metrics);

  return cached;
}
