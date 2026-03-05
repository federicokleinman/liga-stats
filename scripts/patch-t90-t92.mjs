/**
 * Targeted patch: re-ingest T90 (2003) and T92 (2005) for Mayores Masculino,
 * applying the fixed extractDivisional/getSerieWeight logic that now handles
 * 'DIV "X" TIT Y ASC' and 'DIV "X" PERM Y DESC' series names.
 *
 * Run: node scripts/patch-t90-t92.mjs
 */

import { readFileSync, writeFileSync } from 'fs';
import { createRequire } from 'module';

const CACHE_PATH = '.cache/standings.json';
const API_BASE = 'https://ligauniversitaria.org.uy/detallefechas/api.php';
const RATE_LIMIT_MS = 350;
const TORNEO_NAME = 'Mayores Masculino';
const TARGETS = [90, 92]; // temporadaIds to re-ingest

// ── Rate limiter ──────────────────────────────────────────────────────────────
let lastRequest = 0;
async function rFetch(url) {
  const wait = RATE_LIMIT_MS - (Date.now() - lastRequest);
  if (wait > 0) await sleep(wait);
  lastRequest = Date.now();
  const r = await fetch(url, { headers: { Accept: 'application/json, */*' }, signal: AbortSignal.timeout(15000) });
  return r;
}
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function buildUrl(params) {
  return `${API_BASE}?${new URLSearchParams(params).toString()}`;
}

async function fetchJson(params) {
  try {
    const r = await rFetch(buildUrl(params));
    if (!r.ok) return null;
    const txt = await r.text();
    return JSON.parse(txt);
  } catch { return null; }
}

// ── extractDivisional (mirrors fixed ingest.ts logic) ─────────────────────────
function extractDivisional(serieName) {
  // 1. DIVISIONAL full word
  let m = serieName.match(/DIVIS[IO]{1,2}NAL[^"]*"(?:PS)?\s*([A-I])/i);
  if (m) return m[1].toUpperCase();
  // 2. DIV.X no quotes
  m = serieName.match(/DIV\.([A-I])[\s".]/i);
  if (m) return m[1].toUpperCase();
  // 3. DIV."X" with dot+quotes
  m = serieName.match(/\bDIV\.\s*"([A-I])/i);
  if (m) return m[1].toUpperCase();
  // 3b. DIV "X" space before quoted letter (T90/T92)
  m = serieName.match(/\bDIV\s+"([A-I])"/i);
  if (m) return m[1].toUpperCase();
  // 4. CLASIFICATORIO
  m = serieName.match(/CLASIFICATORIO[^"]*"(?:PS)?\s*([A-I])/i);
  if (m) return m[1].toUpperCase();
  // 5. SERIE "X"
  m = serieName.match(/\bSERIE\s*"\s*([A-I])\s*"/i);
  if (m) return m[1].toUpperCase();
  // 6. RUEDA before letter
  m = serieName.match(/RUEDA[^"]*"([A-I])"/i);
  if (m) return m[1].toUpperCase();
  // 7. RUEDA/R.N after letter
  m = serieName.match(/"([A-I])".*?(?:RUEDA|R\.\d)/i);
  if (m) return m[1].toUpperCase();
  // 8. Phase-2 sub-series
  m = serieName.match(/"([A-I])"\s*(?:TITULO|TIT\b|PERMANENCIA|PERM\b|PER\.|ASCENSO|ASC\b|CAMP\.)/i);
  if (m) return m[1].toUpperCase();
  // 9. Simple A-
  const s = serieName.match(/^([A-I])-$/i);
  if (s) return s[1].toUpperCase();
  return '';
}

function getWeight(name) {
  if (/PERMANENCIA|PERM\b|PER\./i.test(name)) return 5;
  if (/COPA|PLATA/i.test(name)) return 4;
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

// ── Match fetcher ─────────────────────────────────────────────────────────────
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
        const txt = await r.text();
        const d = JSON.parse(txt);
        return Array.isArray(d) ? d : [];
      } catch { return []; }
    }));
    for (const r of results) all.push(...r);
    if (i + BATCH < fechas.length) await sleep(300);
  }
  return all;
}

// ── Standings builder ─────────────────────────────────────────────────────────
function guessField(match, candidates) {
  for (const c of candidates) {
    if (match[c] !== undefined) return c;
  }
  return null;
}

function buildStandings(matches) {
  const map = new Map();
  const ensure = name => {
    if (!map.has(name)) map.set(name, { name, pj: 0, pg: 0, pe: 0, pp: 0, gf: 0, gc: 0 });
    return map.get(name);
  };
  for (const m of matches) {
    const lf = guessField(m, ['Locatario', 'local', 'Local', 'home', 'Home', 'Institucion']) || 'Locatario';
    const vf = guessField(m, ['Visitante', 'visita', 'Visita', 'away', 'Away']) || 'Visitante';
    const glf = guessField(m, ['GL', 'goles_local', 'GolesLocal', 'score_home']) || 'GL';
    const gvf = guessField(m, ['GV', 'goles_visita', 'GolesVisita', 'score_away']) || 'GV';
    const l = String(m[lf] || '').trim();
    const v = String(m[vf] || '').trim();
    const gl = parseInt(String(m[glf]), 10);
    const gv = parseInt(String(m[gvf]), 10);
    if (!l || !v || isNaN(gl) || isNaN(gv)) continue;
    const local = ensure(l);
    const visita = ensure(v);
    local.pj++; visita.pj++;
    local.gf += gl; local.gc += gv;
    visita.gf += gv; visita.gc += gl;
    if (gl > gv) { local.pg++; visita.pp++; }
    else if (gl < gv) { visita.pg++; local.pp++; }
    else { local.pe++; visita.pe++; }
  }
  return [...map.values()].map(t => ({ ...t, puntos: t.pg * 3 + t.pe, diferencia: t.gf - t.gc }))
    .sort((a, b) => b.puntos - a.puntos || b.diferencia - a.diferencia || b.gf - a.gf);
}

// ── Name normalizer (simplified) ──────────────────────────────────────────────
function normalizeName(name) {
  return name.trim().replace(/\s+/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}
function slugify(name) {
  return normalizeName(name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function ingestTemporada(temporadaId) {
  console.log(`\n=== Ingesting T${temporadaId} (${temporadaId + 1913}) Mayores Masculino ===`);
  const seriesRaw = await fetchJson({ action: 'cargarSeries', temporada: String(temporadaId), deporte: 'FÚTBOL', torneo: TORNEO_NAME });
  if (!Array.isArray(seriesRaw) || seriesRaw.length === 0) {
    console.log('  No series found');
    return [];
  }
  const series = seriesRaw.map(s => s.nombre).filter(shouldInclude);
  console.log(`  Included series (${series.length}):`, series);

  // Group by divisional
  const groups = new Map(); // divisional -> [{ serie, weight }]
  for (const serie of series) {
    const div = extractDivisional(serie);
    const weight = getWeight(serie);
    if (!groups.has(div)) groups.set(div, []);
    groups.get(div).push({ serie, weight });
  }

  const rows = [];
  for (const [div, combos] of groups.entries()) {
    console.log(`  Div ${div}: combos =`, combos.map(c => `${c.serie}(w${c.weight})`).join(', '));
    const hasZero = combos.some(c => c.weight === 0);
    const hasSix = combos.some(c => c.weight === 6);
    let selected;
    if (hasZero) {
      selected = combos.filter(c => c.weight === 0 || c.weight === 2 || c.weight === 5);
    } else if (hasSix) {
      selected = combos.filter(c => c.weight === 6 || c.weight === 2 || c.weight === 5);
    } else {
      const candidates = combos.filter(c => c.weight !== 4 && c.weight !== 3);
      selected = candidates.length > 0 ? candidates : [combos.reduce((a, b) => a.weight <= b.weight ? a : b)];
    }
    console.log(`    Selected:`, selected.map(c => `${c.serie}(w${c.weight})`).join(', '));

    // Fetch all matches
    const allMatches = [];
    for (const { serie } of selected) {
      console.log(`    Fetching matches for: ${serie}`);
      const matches = await fetchMatches(temporadaId, serie);
      console.log(`      ${matches.length} matches`);
      allMatches.push(...matches);
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
        extras: { matchesPlayed: allMatches.length, fechas: -1, serieOriginal: selected.map(s => s.serie).join(' + ') },
      });
    });
    console.log(`    Built ${standings.length} teams. Champion: ${standings[0]?.name}`);
  }
  return rows;
}

async function main() {
  const cacheRaw = readFileSync(CACHE_PATH, 'utf8');
  const cache = JSON.parse(cacheRaw);
  let rows = cache.rows;

  for (const temporadaId of TARGETS) {
    // Remove old rows for this temporada + Mayores Masculino
    rows = rows.filter(r => !(r.temporadaId === temporadaId && r.torneo === TORNEO_NAME));
    // Re-ingest
    const newRows = await ingestTemporada(temporadaId);
    rows.push(...newRows);
    console.log(`  Added ${newRows.length} rows for T${temporadaId}`);
  }

  cache.rows = rows;
  cache.fetchedAt = new Date().toISOString();
  writeFileSync(CACHE_PATH, JSON.stringify(cache));
  console.log('\nCache updated. Rows total:', rows.length);

  // Verify T92 Div G
  const t92g = rows.filter(r => r.temporadaId === 92 && r.torneo === TORNEO_NAME && r.divisional === 'G').sort((a, b) => a.posicion - b.posicion);
  console.log('\nT92 (2005) Mayores Div G top 5:');
  t92g.slice(0, 5).forEach(r => console.log(`  ${r.posicion}. ${r.equipoNombreNormalizado}  pts=${r.puntos}  pj=${r.pj}`));
}

main().catch(e => { console.error(e); process.exit(1); });
