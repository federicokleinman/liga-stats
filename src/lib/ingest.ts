import type { StandingRow, CachedData } from './types';
import { ALL_TORNEOS } from './types';
import { normalizeName, resetAliasCache } from './normalize';
import { saveCachedData, setMemoryCache, saveAllMetrics } from './storage';
import { computeAllMetrics } from './metrics';

const API_BASE = 'https://ligauniversitaria.org.uy/detallefechas/api.php';
const RATE_LIMIT_MS = 350;
let lastRequestTime = 0;

// Torneos that use numeric series (1, 2, 3...) instead of letter divisionals (A, B, C...)
const NUMERIC_SERIES_TORNEOS = new Set(['SUB 18 ', 'MÁS 40']);

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

function buildUrl(params: Record<string, string>): string {
  return `${API_BASE}?${new URLSearchParams(params).toString()}`;
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

async function fetchSeries(temporada: string, torneo: string): Promise<string[]> {
  const d = await fetchJson<{ nombre: string }[]>({
    action: 'cargarSeries',
    temporada,
    deporte: 'FÚTBOL',
    torneo,
  });
  return d && Array.isArray(d) ? d.map((s) => s.nombre) : [];
}

async function fetchFechas(temporada: string, torneo: string, serie: string): Promise<string[]> {
  const d = await fetchJson<{ fecha: string }[]>({
    action: 'cargarFechas',
    temporada,
    deporte: 'FÚTBOL',
    torneo,
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

async function directFetch(url: string): Promise<Response> {
  return fetch(url, {
    headers: { Accept: 'application/json, text/html, */*' },
    signal: AbortSignal.timeout(15000),
  });
}

async function fetchAllPartidosBatch(temporada: string, torneo: string, serie: string, fechas: string[]): Promise<RawMatch[]> {
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
          torneo,
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

// ── Serie classification ───────────────────────────────────────────

// Extract the divisional identifier from a series name.
// Returns a letter (A-I) for standard divisionals, or a number string ("1", "2"...) for numeric series.
function extractDivisional(serieName: string, useNumbers: boolean): string {
  if (useNumbers) {
    const m = serieName.match(/SERIE\s*"(\d+)"/i);
    return m ? m[1] : '';
  }
  // Letter-based — ordered from most specific to least specific to avoid false positives.
  // IMPORTANT: "DIV\.?" (bare) is intentionally NOT used as an alternation because inside
  // misspelled "DIVISONAL" it matches "DIV" at position 0 and then greedily captures the
  // following "I" as the divisional letter (false positive).

  // 1. DIVISIONAL / DIVISONAL / DIViSIONAL — full-word match, handles common API typos.
  //    Pattern: DIVIS + 1-2 chars from [IO] + NAL, then optional non-quote chars, then quoted letter.
  let m = serieName.match(/DIVIS[IO]{1,2}NAL[^"]*"(?:PS)?\s*([A-I])/i);
  if (m) return m[1].toUpperCase();

  // 2. DIV.X (no quotes around letter) — e.g. "S20DIV.C.SERIE" where C is the divisional.
  //    Must come before the SERIE check so that DIV.C.SERIE"A" returns C, not A.
  //    No \b here: "S20DIV" has a digit before DIV so \b wouldn't fire.
  m = serieName.match(/DIV\.([A-I])[\s".]/i);
  if (m) return m[1].toUpperCase();

  // 3. DIV."X" — abbreviated with mandatory period + quotes — e.g. 'DIV."C" COPA'.
  m = serieName.match(/\bDIV\.\s*"([A-I])/i);
  if (m) return m[1].toUpperCase();

  // 4. CLASIFICATORIO "PSX" (Pre Senior format) or CLASIFICATORIO "X" (Mayores).
  m = serieName.match(/CLASIFICATORIO[^"]*"(?:PS)?\s*([A-I])/i);
  if (m) return m[1].toUpperCase();

  // 5. Serie " A " / Pre-Senior Serie " A " (early seasons T94-T95).
  //    Only reached when none of the DIVISIONAL/DIV patterns matched above.
  m = serieName.match(/\bSERIE\s*"\s*([A-I])\s*"/i);
  if (m) return m[1].toUpperCase();

  // 6. Second/subsequent rounds — RUEDA before the quoted letter.
  //    e.g. "2ª RUEDA PRESENIOR "F""
  m = serieName.match(/RUEDA[^"]*"([A-I])"/i);
  if (m) return m[1].toUpperCase();

  // 7. Second/subsequent rounds — RUEDA or R.N after the quoted letter.
  //    e.g. "PRESENIOR "F" 2ª RUEDA" or "PRESENIOR "E" SERIE 1 R.2"
  m = serieName.match(/"([A-I])".*?(?:RUEDA|R\.\d)/i);
  if (m) return m[1].toUpperCase();

  // 8. Simple "A-" format (very early seasons).
  const simple = serieName.match(/^([A-I])-$/i);
  if (simple) return simple[1].toUpperCase();

  return '';
}

function shouldIncludeSerie(serieName: string, useNumbers: boolean): boolean {
  const id = extractDivisional(serieName, useNumbers);
  if (!id) return false;
  if (!useNumbers) {
    // Skip sub-types like finals, tiebreakers
    const skip = [/DESEMPATE/i, /VICECAMPEONATO/i, /FINAL\b/i];
    return !skip.some((p) => p.test(serieName));
  }
  return true;
}

function getSerieWeight(name: string): number {
  if (/PERMANENCIA|PER\./i.test(name)) return 5;
  if (/COPA|PLATA/i.test(name)) return 4;
  if (/CAMPEON\b/i.test(name)) return 3;
  if (/TITULO|TIT\.|ASCENSO|ASC\./i.test(name)) return 2;
  if (/SERIE/i.test(name)) return 6;
  return 0; // principal
}

// ── Build standings from matches ───────────────────────────────────

interface TeamStats {
  name: string;
  pj: number; pg: number; pe: number; pp: number; gf: number; gc: number;
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
    home.pj++; away.pj++;
    home.gf += gl; home.gc += gv;
    away.gf += gv; away.gc += gl;
    if (gl > gv) { home.pg++; away.pp++; }
    else if (gl < gv) { away.pg++; home.pp++; }
    else { home.pe++; away.pe++; }
  }

  const rows = Array.from(map.values());
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

  type Combo = { torneo: string; temporada: string; serie: string; divisional: string; weight: number; useNumbers: boolean };

  // Phase 1 — discover series for all torneos × temporadas
  const allCombos: Combo[] = [];
  const totalDiscovery = ALL_TORNEOS.length * temporadas.length;
  let discoveryDone = 0;

  for (const torneo of ALL_TORNEOS) {
    const useNumbers = NUMERIC_SERIES_TORNEOS.has(torneo);
    for (const t of temporadas) {
      discoveryDone++;
      onProgress?.(discoveryDone, totalDiscovery, `T${t} ${torneo}: descubriendo series...`);
      const series = await fetchSeries(t, torneo);
      for (const s of series) {
        if (shouldIncludeSerie(s, useNumbers)) {
          const divisional = extractDivisional(s, useNumbers);
          if (divisional) {
            allCombos.push({ torneo, temporada: t, serie: s, divisional, weight: getSerieWeight(s), useNumbers });
          }
        }
      }
    }
  }

  // Group combos by torneo+temporada+divisional and select which series to merge.
  // - Weight 0 (principal/rounds): merge ALL — handles "1ª RUEDA" + "2ª RUEDA" cases.
  // - Weight 6 (SERIE sub-groups): merge ALL when no weight-0 series exist.
  // - Weight 2-5 (TITULO, COPA, PERMANENCIA, etc.): skip when better series exist.
  type ComboGroup = { torneo: string; temporada: string; divisional: string; useNumbers: boolean; series: string[] };

  const groupMap = new Map<string, { combos: Combo[]; hasZero: boolean; hasSix: boolean }>();
  for (const c of allCombos) {
    const k = `${c.torneo}|${c.temporada}|${c.divisional}`;
    if (!groupMap.has(k)) groupMap.set(k, { combos: [], hasZero: false, hasSix: false });
    const g = groupMap.get(k)!;
    g.combos.push(c);
    if (c.weight === 0) g.hasZero = true;
    if (c.weight === 6) g.hasSix = true;
  }

  const groups: ComboGroup[] = [];
  for (const g of Array.from(groupMap.values())) {
    let selected: Combo[];
    if (g.hasZero) {
      selected = g.combos.filter((c) => c.weight === 0);
    } else if (g.hasSix) {
      selected = g.combos.filter((c) => c.weight === 6);
    } else {
      const minW = Math.min(...g.combos.map((c) => c.weight));
      selected = g.combos.filter((c) => c.weight === minW);
    }
    const first = selected[0];
    groups.push({
      torneo: first.torneo,
      temporada: first.temporada,
      divisional: first.divisional,
      useNumbers: first.useNumbers,
      series: selected.map((c) => c.serie),
    });
  }

  // Phase 2 — fetch matches for all groups with controlled concurrency.
  // Each group may include multiple series (rounds/sub-groups) whose matches are merged.
  const allRows: StandingRow[] = [];
  const divisionalSet = new Set<string>();
  const torneoSet = new Set<string>();
  let done = 0;
  const total = groups.length;
  const COMBO_CONCURRENCY = 3;

  onProgress?.(0, total, `${total} divisionales a descargar (${ALL_TORNEOS.length} categorías)`);

  async function processGroup(group: ComboGroup): Promise<StandingRow[]> {
    const { torneo, temporada, divisional, series } = group;
    const tempNum = parseInt(temporada, 10);
    const allMatches: RawMatch[] = [];

    for (const serie of series) {
      const fechas = await fetchFechas(temporada, torneo, serie);
      if (fechas.length > 0) {
        const matches = await fetchAllPartidosBatch(temporada, torneo, serie, fechas);
        allMatches.push(...matches);
      }
    }

    if (allMatches.length === 0) return [];

    const standings = buildStandings(allMatches);
    const rows: StandingRow[] = [];
    for (let pos = 0; pos < standings.length; pos++) {
      const s = standings[pos];
      const { normalized, teamId } = await normalizeName(s.name);
      const puntos = s.pg * 3 + s.pe;
      rows.push({
        temporadaId: tempNum,
        torneo,
        divisional,
        equipoNombre: s.name,
        equipoNombreNormalizado: normalized,
        teamId,
        posicion: pos + 1,
        pj: s.pj, pg: s.pg, pe: s.pe, pp: s.pp,
        gf: s.gf, gc: s.gc,
        puntos,
        diferencia: s.gf - s.gc,
        extras: { matchesPlayed: allMatches.length, fechas: -1, serieOriginal: series[0] },
      });
    }
    return rows;
  }

  for (let i = 0; i < groups.length; i += COMBO_CONCURRENCY) {
    const batch = groups.slice(i, i + COMBO_CONCURRENCY);
    const results = await Promise.allSettled(
      batch.map(async (group) => {
        torneoSet.add(group.torneo);
        divisionalSet.add(group.divisional);
        try {
          const rows = await processGroup(group);
          done++;
          const label = group.useNumbers ? `Serie ${group.divisional}` : `Div${group.divisional}`;
          const seriesNote = group.series.length > 1 ? ` (${group.series.length} rondas)` : '';
          const msg = rows.length > 0
            ? `T${group.temporada} [${group.torneo}] ${label}${seriesNote}: ${rows.length} equipos`
            : `T${group.temporada} [${group.torneo}] ${label}: sin datos`;
          onProgress?.(done, total, msg);
          return rows;
        } catch {
          done++;
          onProgress?.(done, total, `T${group.temporada} [${group.torneo}]: error`);
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
    torneos: Array.from(torneoSet),
  };

  await saveCachedData(cached);

  // Compute metrics per torneo
  const allMetrics: Record<string, ReturnType<typeof computeAllMetrics>> = {};
  for (const torneo of Array.from(torneoSet)) {
    allMetrics[torneo] = computeAllMetrics(cached, torneo);
  }
  await saveAllMetrics(allMetrics);
  setMemoryCache(cached, allMetrics);

  return cached;
}
