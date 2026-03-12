/**
 * Targeted patch: re-ingest T102 (2015) for Mayores Masculino.
 * Fixes:
 *  - Missing divisionals D, E, F (ingestion errors in original cache)
 *  - Incomplete data (only 7 PJ instead of 15+) for divs A, B, C, G, H, I
 *  - Merges phase-2 series (DIV. "X" TITULO, DIV. "X" PERMANENCIA)
 *
 * Run: node scripts/patch-t102.mjs
 */

import { readFileSync, writeFileSync } from 'fs';

const CACHE_PATH = '.cache/standings.json';
const API_BASE = 'https://ligauniversitaria.org.uy/detallefechas/api.php';
const RATE_LIMIT_MS = 350;
const TORNEO_NAME = 'Mayores Masculino';
const TARGETS = [102];

let lastRequest = 0;
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
async function rFetch(url) {
  const wait = RATE_LIMIT_MS - (Date.now() - lastRequest);
  if (wait > 0) await sleep(wait);
  lastRequest = Date.now();
  return fetch(url, { headers: { Accept: 'application/json, */*' }, signal: AbortSignal.timeout(15000) });
}
function buildUrl(params) {
  return `${API_BASE}?${new URLSearchParams(params).toString()}`;
}
async function fetchJson(params) {
  try {
    const r = await rFetch(buildUrl(params));
    if (!r.ok) return null;
    return JSON.parse(await r.text());
  } catch { return null; }
}

// ── extractDivisional (mirrors ingest.ts) ───────────────────
function extractDivisional(serieName) {
  let m = serieName.match(/DIVIS[IO]{1,2}NAL[^"]*"(?:PS)?\s*([A-Z])/i);
  if (m) return m[1].toUpperCase();
  m = serieName.match(/DIV\.([A-Z])[\s".]/i);
  if (m) return m[1].toUpperCase();
  m = serieName.match(/\bDIV\.\s*"([A-Z])/i);
  if (m) return m[1].toUpperCase();
  m = serieName.match(/\bDIV\s+"([A-Z])"/i);
  if (m) return m[1].toUpperCase();
  m = serieName.match(/CLASIFICATORIO[^"]*"(?:PS)?\s*([A-Z])/i);
  if (m) return m[1].toUpperCase();
  m = serieName.match(/\bSERIE\s*"\s*([A-Z])\s*"/i);
  if (m) return m[1].toUpperCase();
  m = serieName.match(/RUEDA[^"]*"([A-Z])"/i);
  if (m) return m[1].toUpperCase();
  m = serieName.match(/"([A-Z])".*?(?:RUEDA|R\.\d)/i);
  if (m) return m[1].toUpperCase();
  m = serieName.match(/"([A-Z])"\s*(?:TITULO|TIT\b|PERMANENCIA|PERM\b|PER\.|ASCENSO|ASC\b|CAMP\.)/i);
  if (m) return m[1].toUpperCase();
  const s = serieName.match(/^([A-Z])-$/i);
  if (s) return s[1].toUpperCase();
  return '';
}

function getWeight(name) {
  if (/PERMANENCIA|PERM\b|PER\./i.test(name)) return 5;
  if (/COPA|PLATA|\bORO\b|\bBRONCE\b/i.test(name)) return 4;
  if (/CAMPEON\b/i.test(name)) return 3;
  if (/TITULO|TIT\b|ASCENSO|ASC\b/i.test(name)) return 2;
  if (/SERIE/i.test(name)) return 6;
  return 0;
}

function shouldInclude(name) {
  const id = extractDivisional(name);
  if (!id) return false;
  const skip = [/DESEMPATE/i, /VICECAMPEONATO/i, /FINAL\b/i];
  return !skip.some(p => p.test(name));
}

async function fetchMatches(temporada, serie) {
  const fechasRaw = await fetchJson({ action: 'cargarFechas', temporada: String(temporada), deporte: 'FÚTBOL', torneo: TORNEO_NAME, serie });
  const fechas = Array.isArray(fechasRaw) ? fechasRaw.map(f => f.fecha) : [];
  const all = [];
  const BATCH = 4;
  for (let i = 0; i < fechas.length; i += BATCH) {
    const batch = fechas.slice(i, i + BATCH);
    const results = await Promise.all(batch.map(async (f, idx) => {
      await sleep(idx * 150);
      const url = buildUrl({ action: 'cargarPartidos', temporada: String(temporada), deporte: 'FÚTBOL', torneo: TORNEO_NAME, serie, fecha: f });
      try {
        const r = await fetch(url, { headers: { Accept: 'application/json, */*' }, signal: AbortSignal.timeout(15000) });
        if (!r.ok) return [];
        const d = JSON.parse(await r.text());
        return Array.isArray(d) ? d : [];
      } catch { return []; }
    }));
    for (const r of results) all.push(...r);
    if (i + BATCH < fechas.length) await sleep(300);
  }
  return all;
}

function buildStandings(matches) {
  const map = new Map();
  const ensure = name => {
    if (!map.has(name)) map.set(name, { name, pj: 0, pg: 0, pe: 0, pp: 0, gf: 0, gc: 0 });
    return map.get(name);
  };
  for (const m of matches) {
    const l = String(m.Locatario || '').trim();
    const v = String(m.Visitante || '').trim();
    const gl = parseInt(String(m.GL), 10);
    const gv = parseInt(String(m.GV), 10);
    if (!l || !v || isNaN(gl) || isNaN(gv)) continue;
    const local = ensure(l); const visita = ensure(v);
    local.pj++; visita.pj++;
    local.gf += gl; local.gc += gv; visita.gf += gv; visita.gc += gl;
    if (gl > gv) { local.pg++; visita.pp++; }
    else if (gl < gv) { visita.pg++; local.pp++; }
    else { local.pe++; visita.pe++; }
  }
  return [...map.values()].map(t => ({ ...t, puntos: t.pg * 3 + t.pe, diferencia: t.gf - t.gc }))
    .sort((a, b) => b.puntos - a.puntos || b.diferencia - a.diferencia || b.gf - a.gf);
}

function normalizeName(n) { return n.trim().replace(/\s+/g,' ').toLowerCase().replace(/\b\w/g,c=>c.toUpperCase()); }
function slugify(n) { return normalizeName(n).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,''); }

async function ingestTemporada(temporadaId) {
  console.log(`\n=== T${temporadaId} (${temporadaId+1913}) Mayores Masculino ===`);
  const seriesRaw = await fetchJson({ action: 'cargarSeries', temporada: String(temporadaId), deporte: 'FÚTBOL', torneo: TORNEO_NAME });
  if (!Array.isArray(seriesRaw)) { console.log('  No series'); return []; }
  const allSeriesNames = seriesRaw.map(s => s.nombre);
  console.log(`  All series from API: ${allSeriesNames.length}`);
  allSeriesNames.forEach(s => {
    const div = extractDivisional(s);
    const w = getWeight(s);
    const inc = shouldInclude(s);
    console.log(`    ${s} -> div=${div}, weight=${w}, include=${inc}`);
  });

  const series = allSeriesNames.filter(shouldInclude);
  console.log(`  Included: ${series.length} series`);

  const groups = new Map();
  for (const serie of series) {
    const div = extractDivisional(serie);
    const weight = getWeight(serie);
    if (!groups.has(div)) groups.set(div, []);
    groups.get(div).push({ serie, weight });
  }

  const rows = [];
  for (const [div, combos] of groups.entries()) {
    const hasZero = combos.some(c => c.weight === 0);
    const hasSix = combos.some(c => c.weight === 6);
    let selected;
    if (hasZero) {
      selected = combos.filter(c => c.weight === 0 || c.weight === 2 || c.weight === 5);
    } else if (hasSix) {
      selected = combos.filter(c => c.weight === 6 || c.weight === 2 || c.weight === 5);
    } else {
      const cands = combos.filter(c => c.weight !== 4 && c.weight !== 3);
      selected = cands.length > 0 ? cands : [combos.reduce((a,b) => a.weight<=b.weight?a:b)];
    }
    console.log(`  Div ${div}: selected = ${selected.map(c=>`${c.serie}(w${c.weight})`).join(', ')}`);

    const allMatches = [];
    for (const { serie } of selected) {
      const ms = await fetchMatches(temporadaId, serie);
      allMatches.push(...ms);
      console.log(`    ${serie}: ${ms.length} matches`);
    }

    const standings = buildStandings(allMatches);
    standings.forEach((t, i) => {
      rows.push({
        temporadaId,
        torneo: TORNEO_NAME,
        divisional: div,
        equipoNombre: t.name,
        equipoNombreNormalizado: normalizeName(t.name),
        teamId: slugify(t.name),
        posicion: i + 1,
        pj: t.pj, pg: t.pg, pe: t.pe, pp: t.pp,
        gf: t.gf, gc: t.gc, puntos: t.puntos, diferencia: t.diferencia,
        extras: { matchesPlayed: allMatches.length, fechas: -1, serieOriginal: selected.map(s=>s.serie).join(' + ') },
      });
    });
    console.log(`    -> ${standings.length} teams, maxPJ=${Math.max(...standings.map(t=>t.pj))}`);
  }
  return rows;
}

async function main() {
  const cache = JSON.parse(readFileSync(CACHE_PATH, 'utf8'));
  let rows = cache.rows;

  for (const temporadaId of TARGETS) {
    const before = rows.filter(r => r.temporadaId === temporadaId && r.torneo === TORNEO_NAME).length;
    rows = rows.filter(r => !(r.temporadaId === temporadaId && r.torneo === TORNEO_NAME));
    console.log(`Removed ${before} old T${temporadaId} ${TORNEO_NAME} rows`);
    const newRows = await ingestTemporada(temporadaId);
    rows.push(...newRows);
    console.log(`  -> Added ${newRows.length} rows`);
  }

  cache.rows = rows;
  cache.fetchedAt = new Date().toISOString();
  writeFileSync(CACHE_PATH, JSON.stringify(cache));
  console.log('\nCache updated. Total rows:', rows.length);
}

main().catch(e => { console.error(e); process.exit(1); });
