/**
 * Standalone script to ingest player data for a specific temporada/divisional.
 * Usage: node scripts/ingest-players.mjs [temporadaId] [divisional]
 * Default: T112, Div A (2025 Mayores Masculino)
 */

const API_BASE = 'https://ligauniversitaria.org.uy/detallefechas/api.php';
const TORNEO = 'Mayores Masculino';
const RATE_LIMIT_MS = 200;
let lastRequest = 0;

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';

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

async function collectMatchIds(temporada, divisional) {
  const allSeries = await fetchJson({ action: 'cargarSeries', temporada: String(temporada), deporte: 'FÚTBOL', torneo: TORNEO });
  if (!Array.isArray(allSeries)) return [];

  const divRegex = new RegExp(`"\\s*${divisional}\\s*"`, 'i');
  const matching = allSeries.map(s => s.nombre).filter(n => divRegex.test(n));
  console.log(`  Series matching Div ${divisional}:`, matching);

  const ids = [];
  const seen = new Set();
  for (const serie of matching) {
    const fechas = await fetchJson({ action: 'cargarFechas', temporada: String(temporada), deporte: 'FÚTBOL', torneo: TORNEO, serie });
    if (!Array.isArray(fechas)) continue;
    for (const f of fechas) {
      const ms = await fetchJson({ action: 'cargarPartidos', temporada: String(temporada), deporte: 'FÚTBOL', torneo: TORNEO, serie, fecha: f.fecha });
      if (!Array.isArray(ms)) continue;
      for (const m of ms) {
        if (m.ID && !seen.has(m.ID)) { seen.add(m.ID); ids.push(m.ID); }
      }
    }
  }
  return ids;
}

async function fetchMatchDetail(id) {
  const p = { id };
  const [det, titL, titV, camL, camV, golL, golV, amoL, amoV, expL, expV] = await Promise.all([
    fetchJson({ action: 'cargarDetallesPartido', ...p }),
    fetchJson({ action: 'Titulares Locatario', ...p }),
    fetchJson({ action: 'Titulares Visitante', ...p }),
    fetchJson({ action: 'CambiosLocatario', ...p }),
    fetchJson({ action: 'CambiosVisitante', ...p }),
    fetchJson({ action: 'GolesLocatario', ...p }),
    fetchJson({ action: 'GolesVisitante', ...p }),
    fetchJson({ action: 'Amonestados Locatario', ...p }),
    fetchJson({ action: 'Amonestados Visitante', ...p }),
    fetchJson({ action: 'Expulsados Locatario', ...p }),
    fetchJson({ action: 'Expulsados Visitante', ...p }),
  ]);
  if (!det || !Array.isArray(det) || !det.length) return null;
  const d = det[0];
  return {
    matchId: id,
    fecha: d.Fecha_Inicio || '',
    local: d.Locatario,
    visitante: d.Visitante,
    golesLocal: parseInt(d.goles_locatario) || 0,
    golesVisitante: parseInt(d.goles_visitante) || 0,
    titularesLocal: Array.isArray(titL) ? titL : [],
    titularesVisitante: Array.isArray(titV) ? titV : [],
    cambiosLocal: Array.isArray(camL) ? camL : [],
    cambiosVisitante: Array.isArray(camV) ? camV : [],
    golesDetLocal: Array.isArray(golL) ? golL : [],
    golesDetVisitante: Array.isArray(golV) ? golV : [],
    amonestadosLocal: Array.isArray(amoL) ? amoL.map(a => a.Nombre) : [],
    amonestadosVisitante: Array.isArray(amoV) ? amoV.map(a => a.Nombre) : [],
    expulsadosLocal: Array.isArray(expL) ? expL.map(e => e.Nombre) : [],
    expulsadosVisitante: Array.isArray(expV) ? expV.map(e => e.Nombre) : [],
  };
}

function calcMinutes(playerName, isTitular, cambios) {
  const norm = s => s.trim().toUpperCase();
  const pName = norm(playerName);
  if (isTitular) {
    const out = cambios.find(c => norm(c.Jug_Sale) === pName);
    return out ? Math.max(parseInt(out.minutos) || 0, 1) : 90;
  }
  const inn = cambios.find(c => norm(c.Jug_Entra) === pName);
  if (!inn) return 0;
  const enteredAt = parseInt(inn.minutos) || 0;
  const out2 = cambios.find(c => norm(c.Jug_Sale) === pName && parseInt(c.minutos) > enteredAt);
  return out2 ? (parseInt(out2.minutos) || 90) - enteredAt : 90 - enteredAt;
}

function processMatch(detail) {
  const resultado = `${detail.golesLocal}-${detail.golesVisitante}`;
  const apps = [];
  const norm = s => s.trim().toUpperCase();
  for (const side of ['local', 'visitante']) {
    const esLocal = side === 'local';
    const equipo = esLocal ? detail.local : detail.visitante;
    const rival = esLocal ? detail.visitante : detail.local;
    const tits = esLocal ? detail.titularesLocal : detail.titularesVisitante;
    const cams = esLocal ? detail.cambiosLocal : detail.cambiosVisitante;
    const gols = esLocal ? detail.golesDetLocal : detail.golesDetVisitante;
    const amos = esLocal ? detail.amonestadosLocal : detail.amonestadosVisitante;
    const exps = esLocal ? detail.expulsadosLocal : detail.expulsadosVisitante;
    const amoSet = new Set(amos.map(norm));
    const expSet = new Set(exps.map(norm));
    const golesMap = new Map();
    for (const g of gols) {
      const k = norm(g.Nombre);
      const p = golesMap.get(k) || { goles: 0, ec: 0 };
      p.goles++;
      golesMap.set(k, p);
    }
    for (const t of tits) {
      const name = t.Nombre.trim();
      const u = norm(name);
      const gd = golesMap.get(u) || { goles: 0, ec: 0 };
      apps.push({ matchId: detail.matchId, fecha: detail.fecha, equipo, rival, esLocal, resultado, titular: true, minutosJugados: calcMinutes(name, true, cams), goles: gd.goles, golesEnContra: gd.ec, amarilla: amoSet.has(u), roja: expSet.has(u), nombreJugador: name, carne: t.carne || '' });
    }
    for (const c of cams) {
      const name = c.Jug_Entra.trim();
      const u = norm(name);
      const gd = golesMap.get(u) || { goles: 0, ec: 0 };
      apps.push({ matchId: detail.matchId, fecha: detail.fecha, equipo, rival, esLocal, resultado, titular: false, minutosJugados: calcMinutes(name, false, cams), goles: gd.goles, golesEnContra: gd.ec, amarilla: amoSet.has(u), roja: expSet.has(u), nombreJugador: name, carne: c.CarneEntra || '' });
    }
  }
  return apps;
}

function slugify(name) {
  return name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function aggregate(allApps) {
  const byPlayer = new Map();
  for (const a of allApps) {
    const key = a.carne ? `carne:${a.carne}` : `name:${a.equipo.trim().toUpperCase()}__${a.nombreJugador.trim().toUpperCase()}`;
    if (!byPlayer.has(key)) byPlayer.set(key, []);
    byPlayer.get(key).push(a);
  }
  const players = [];
  for (const [, apps] of byPlayer) {
    const nombre = apps[0].nombreJugador;
    const carne = apps[0].carne;
    const tc = new Map();
    for (const a of apps) tc.set(a.equipo, (tc.get(a.equipo) || 0) + 1);
    const primaryTeam = Array.from(tc.entries()).sort((a, b) => b[1] - a[1])[0][0];
    const equipos = Array.from(tc.keys());
    const byMatch = new Map();
    for (const a of apps) { if (!byMatch.has(a.matchId)) byMatch.set(a.matchId, a); }
    const unique = Array.from(byMatch.values());
    players.push({
      playerId: carne ? `c-${carne}` : slugify(nombre),
      nombre, carne, equipo: primaryTeam, equipos,
      pj: unique.length,
      titular: unique.filter(a => a.titular).length,
      suplente: unique.filter(a => !a.titular).length,
      minutos: unique.reduce((s, a) => s + a.minutosJugados, 0),
      goles: unique.reduce((s, a) => s + a.goles, 0),
      golesEnContra: unique.reduce((s, a) => s + a.golesEnContra, 0),
      amarillas: unique.filter(a => a.amarilla).length,
      rojas: unique.filter(a => a.roja).length,
      partidos: unique.map(a => ({ matchId: a.matchId, fecha: a.fecha, equipo: a.equipo, rival: a.rival, esLocal: a.esLocal, resultado: a.resultado, titular: a.titular, minutosJugados: a.minutosJugados, goles: a.goles, golesEnContra: a.golesEnContra, amarilla: a.amarilla, roja: a.roja })),
    });
  }
  players.sort((a, b) => b.goles - a.goles || b.minutos - a.minutos || a.nombre.localeCompare(b.nombre));
  return players;
}

async function main() {
  const temporadaId = parseInt(process.argv[2]) || 112;
  const divisional = (process.argv[3] || 'A').toUpperCase();
  console.log(`\n=== Ingesting player data: T${temporadaId} (${temporadaId + 1913}) ${TORNEO} Div ${divisional} ===\n`);

  const matchIds = await collectMatchIds(temporadaId, divisional);
  console.log(`\nFound ${matchIds.length} unique matches\n`);

  const allApps = [];
  const BATCH = 3;
  for (let i = 0; i < matchIds.length; i += BATCH) {
    const batch = matchIds.slice(i, i + BATCH);
    const results = await Promise.all(batch.map(async (id, idx) => {
      if (idx > 0) await sleep(idx * 100);
      return fetchMatchDetail(id);
    }));
    for (const d of results) {
      if (d) allApps.push(...processMatch(d));
    }
    const done = Math.min(i + BATCH, matchIds.length);
    process.stdout.write(`\r  ${done}/${matchIds.length} matches processed`);
  }
  console.log('\n');

  const players = aggregate(allApps);
  console.log(`Aggregated ${players.length} players`);

  // Top 10 goleadores
  console.log('\nTop 10 goleadores:');
  players.filter(p => p.goles > 0).slice(0, 10).forEach((p, i) => {
    console.log(`  ${i + 1}. ${p.nombre} (${p.equipo}) - ${p.goles} goles, ${p.pj} PJ, ${p.minutos} min`);
  });

  const cache = {
    temporadaId, torneo: TORNEO, divisional,
    fetchedAt: new Date().toISOString(),
    players,
  };

  if (!existsSync('.cache')) mkdirSync('.cache', { recursive: true });
  const fileName = `.cache/players-t${temporadaId}-${divisional.toLowerCase()}.json`;
  writeFileSync(fileName, JSON.stringify(cache));
  console.log(`\nSaved to ${fileName}`);
}

main().catch(e => { console.error(e); process.exit(1); });
