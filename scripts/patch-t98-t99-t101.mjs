/**
 * Targeted patch: re-ingest T98 (2011), T99 (2012) and T101 (2014) for Mayores Masculino.
 * Fixes:
 *  - [A-Z] range to capture Div J (and beyond) — T99 has Div J
 *  - ORO/BRONCE classified as cup (weight 4) — T98 Div I "ORO" was stealing principal slot
 *  - T101 G/H/I divisions that were missing from previous cache ingestion
 *
 * Run: node scripts/patch-t98-t99-t101.mjs
 */

import { readFileSync, writeFileSync } from 'fs';

const CACHE_PATH = '.cache/standings.json';
const API_BASE = 'https://ligauniversitaria.org.uy/detallefechas/api.php';
const RATE_LIMIT_MS = 350;
const TORNEO_NAME = 'Mayores Masculino';
const TARGETS = [98, 99, 101];

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

// ── extractDivisional (mirrors fixed ingest.ts — A-Z range) ───────────────────
function extractDivisional(serieName) {
  // 1. DIVISIONAL full word (typo-tolerant)
  let m = serieName.match(/DIVIS[IO]{1,2}NAL[^"]*"(?:PS)?\s*([A-Z])/i);
  if (m) return m[1].toUpperCase();
  // 2. DIV.X no quotes
  m = serieName.match(/DIV\.([A-Z])[\s".]/i);
  if (m) return m[1].toUpperCase();
  // 3. DIV."X" with dot+quotes
  m = serieName.match(/\bDIV\.\s*"([A-Z])/i);
  if (m) return m[1].toUpperCase();
  // 3b. DIV "X" space before quoted letter
  m = serieName.match(/\bDIV\s+"([A-Z])"/i);
  if (m) return m[1].toUpperCase();
  // 4. CLASIFICATORIO
  m = serieName.match(/CLASIFICATORIO[^"]*"(?:PS)?\s*([A-Z])/i);
  if (m) return m[1].toUpperCase();
  // 5. SERIE "X"
  m = serieName.match(/\bSERIE\s*"\s*([A-Z])\s*"/i);
  if (m) return m[1].toUpperCase();
  // 6. RUEDA before letter
  m = serieName.match(/RUEDA[^"]*"([A-Z])"/i);
  if (m) return m[1].toUpperCase();
  // 7. RUEDA/R.N after letter
  m = serieName.match(/"([A-Z])".*?(?:RUEDA|R\.\d)/i);
  if (m) return m[1].toUpperCase();
  // 8. Phase-2 sub-series
  m = serieName.match(/"([A-Z])"\s*(?:TITULO|TIT\b|PERMANENCIA|PERM\b|PER\.|ASCENSO|ASC\b|CAMP\.)/i);
  if (m) return m[1].toUpperCase();
  // 9. Simple A-
  const s = serieName.match(/^([A-Z])-$/i);
  if (s) return s[1].toUpperCase();
  return '';
}

function getWeight(name) {
  if (/PERMANENCIA|PERM\b|PER\./i.test(name)) return 5;
  if (/COPA|PLATA|\bORO\b|\bBRONCE\b/i.test(name)) return 4;  // ORO/BRONCE are cups
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
    const lf = ['Locatario','local','Local','home','Home','Institucion'].find(k => m[k] !== undefined) || 'Locatario';
    const vf = ['Visitante','visita','Visita','away','Away'].find(k => m[k] !== undefined) || 'Visitante';
    const glf = ['GL','goles_local','GolesLocal'].find(k => m[k] !== undefined) || 'GL';
    const gvf = ['GV','goles_visita','GolesVisita'].find(k => m[k] !== undefined) || 'GV';
    const l = String(m[lf] || '').trim();
    const v = String(m[vf] || '').trim();
    const gl = parseInt(String(m[glf]), 10);
    const gv = parseInt(String(m[gvf]), 10);
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
  console.log(`\n=== T${temporadaId} (${temporadaId+1913}) Mayores ===`);
  const seriesRaw = await fetchJson({ action: 'cargarSeries', temporada: String(temporadaId), deporte: 'FÚTBOL', torneo: TORNEO_NAME });
  if (!Array.isArray(seriesRaw)) { console.log('  No series'); return []; }
  const series = seriesRaw.map(s => s.nombre).filter(shouldInclude);
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
    // Report if Clara Jackson is present
    const cj = standings.find(t => t.name.toLowerCase().includes('clara'));
    if (cj) console.log(`    *** Clara Jackson: pos ${standings.indexOf(cj)+1}, pts ${cj.puntos} ***`);
    console.log(`    Champion: ${standings[0]?.name} (${standings.length} teams)`);
  }
  return rows;
}

async function main() {
  const cache = JSON.parse(readFileSync(CACHE_PATH, 'utf8'));
  let rows = cache.rows;

  for (const temporadaId of TARGETS) {
    rows = rows.filter(r => !(r.temporadaId === temporadaId && r.torneo === TORNEO_NAME));
    const newRows = await ingestTemporada(temporadaId);
    rows.push(...newRows);
    console.log(`  -> Added ${newRows.length} rows`);
  }

  cache.rows = rows;
  cache.fetchedAt = new Date().toISOString();
  writeFileSync(CACHE_PATH, JSON.stringify(cache));
  console.log('\nCache updated. Total rows:', rows.length);

  // Summary for Clara Jackson
  const cjRows = rows.filter(r => r.teamId === 'clara-jackson-universitario' && r.torneo === TORNEO_NAME);
  cjRows.sort((a,b) => a.temporadaId - b.temporadaId);
  console.log('\nClara Jackson Mayores seasons now:');
  cjRows.forEach(r => console.log(` T${r.temporadaId} (${r.temporadaId+1913}) Div ${r.divisional} pos:${r.posicion} pts:${r.puntos}`));
}

main().catch(e => { console.error(e); process.exit(1); });
