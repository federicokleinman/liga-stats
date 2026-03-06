import type { PlayerMatchAppearance, PlayerSeason, PlayerCache } from './playerTypes';
import { slugify } from './normalize';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

const API_BASE = 'https://ligauniversitaria.org.uy/detallefechas/api.php';
const RATE_LIMIT_MS = 200;
let lastRequestTime = 0;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function rateLimitedFetch(url: string): Promise<Response> {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < RATE_LIMIT_MS) await sleep(RATE_LIMIT_MS - elapsed);
  lastRequestTime = Date.now();
  return fetch(url, {
    headers: { Accept: 'application/json, */*' },
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

// ── Raw API types ────────────────────────────────────────────────────────────

interface RawMatch {
  Fecha: string;
  Fecha_Hora?: string;
  Cancha?: string;
  Locatario: string;
  GL: string;
  Visitante: string;
  GV: string;
  ID: string;
}

interface RawTitular {
  carne: string;
  Nombre: string;
  camiseta: string;
  Capitan: string;
}

interface RawCambio {
  CarneSale: string;
  Jug_Sale: string;
  CarneEntra: string;
  Jug_Entra: string;
  camiseta: string;
  minutos: string;
}

interface RawGol {
  carne: string;
  Nombre: string;
  minutos: string;
  EnContra: string;
}

interface RawAmonestado {
  Nombre: string;
}

interface RawExpulsado {
  Nombre: string;
  observaciones?: string;
}

// ── Per-match detail fetcher ─────────────────────────────────────────────────

interface MatchDetail {
  matchId: string;
  fecha: string;
  local: string;
  visitante: string;
  golesLocal: number;
  golesVisitante: number;
  titularesLocal: RawTitular[];
  titularesVisitante: RawTitular[];
  cambiosLocal: RawCambio[];
  cambiosVisitante: RawCambio[];
  golesDetLocal: RawGol[];
  golesDetVisitante: RawGol[];
  amonestadosLocal: string[];
  amonestadosVisitante: string[];
  expulsadosLocal: string[];
  expulsadosVisitante: string[];
}

async function fetchMatchDetail(matchId: string): Promise<MatchDetail | null> {
  const params = { id: matchId };

  const [
    detalle,
    titL, titV,
    camL, camV,
    golL, golV,
    amoL, amoV,
    expL, expV,
  ] = await Promise.all([
    fetchJson<Array<{ Locatario: string; Visitante: string; goles_locatario: string; goles_visitante: string; Fecha_Inicio: string }>>({ action: 'cargarDetallesPartido', ...params }),
    fetchJson<RawTitular[]>({ action: 'Titulares Locatario', ...params }),
    fetchJson<RawTitular[]>({ action: 'Titulares Visitante', ...params }),
    fetchJson<RawCambio[]>({ action: 'CambiosLocatario', ...params }),
    fetchJson<RawCambio[]>({ action: 'CambiosVisitante', ...params }),
    fetchJson<RawGol[]>({ action: 'GolesLocatario', ...params }),
    fetchJson<RawGol[]>({ action: 'GolesVisitante', ...params }),
    fetchJson<RawAmonestado[]>({ action: 'Amonestados Locatario', ...params }),
    fetchJson<RawAmonestado[]>({ action: 'Amonestados Visitante', ...params }),
    fetchJson<RawExpulsado[]>({ action: 'Expulsados Locatario', ...params }),
    fetchJson<RawExpulsado[]>({ action: 'Expulsados Visitante', ...params }),
  ]);

  if (!detalle || !Array.isArray(detalle) || detalle.length === 0) return null;
  const d = detalle[0];

  return {
    matchId,
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
    amonestadosLocal: Array.isArray(amoL) ? amoL.map((a) => a.Nombre) : [],
    amonestadosVisitante: Array.isArray(amoV) ? amoV.map((a) => a.Nombre) : [],
    expulsadosLocal: Array.isArray(expL) ? expL.map((e) => e.Nombre) : [],
    expulsadosVisitante: Array.isArray(expV) ? expV.map((e) => e.Nombre) : [],
  };
}

// ── Collect match IDs ────────────────────────────────────────────────────────

async function collectMatchIds(
  temporada: string,
  torneo: string,
  divisional: string,
  onProgress?: (msg: string) => void,
): Promise<{ matchId: string; serieOriginal: string }[]> {
  const allSeries = await fetchJson<{ nombre: string }[]>({
    action: 'cargarSeries',
    temporada,
    deporte: 'FÚTBOL',
    torneo,
  });
  if (!allSeries || !Array.isArray(allSeries)) return [];

  const divRegex = new RegExp(`"\\s*${divisional}\\s*"`, 'i');
  const matchingSeries = allSeries.map((s) => s.nombre).filter((n) => divRegex.test(n));

  const ids: { matchId: string; serieOriginal: string }[] = [];
  const seen = new Set<string>();

  for (const serie of matchingSeries) {
    onProgress?.(`Serie: ${serie}`);
    const fechas = await fetchJson<{ fecha: string }[]>({
      action: 'cargarFechas',
      temporada,
      deporte: 'FÚTBOL',
      torneo,
      serie,
    });
    if (!Array.isArray(fechas)) continue;

    for (const f of fechas) {
      const matches = await fetchJson<RawMatch[]>({
        action: 'cargarPartidos',
        temporada,
        deporte: 'FÚTBOL',
        torneo,
        serie,
        fecha: f.fecha,
      });
      if (!Array.isArray(matches)) continue;
      for (const m of matches) {
        if (m.ID && !seen.has(m.ID)) {
          seen.add(m.ID);
          ids.push({ matchId: m.ID, serieOriginal: serie });
        }
      }
    }
  }

  return ids;
}

// ── Minutes calculation ──────────────────────────────────────────────────────

function calcMinutes(
  playerName: string,
  isTitular: boolean,
  cambios: RawCambio[],
): number {
  const norm = (s: string) => s.trim().toUpperCase();
  const pName = norm(playerName);

  const events: { min: number; type: 'in' | 'out' }[] = [];
  for (const c of cambios) {
    const min = parseInt(c.minutos) || 0;
    if (norm(c.Jug_Sale) === pName) events.push({ min, type: 'out' });
    if (norm(c.Jug_Entra) === pName) events.push({ min, type: 'in' });
  }
  events.sort((a, b) => a.min - b.min || (a.type === 'out' ? -1 : 1));

  let onField = isTitular;
  let lastEntry = isTitular ? 0 : 0;
  let total = 0;

  for (const e of events) {
    if (e.type === 'out' && onField) {
      total += e.min - lastEntry;
      onField = false;
    } else if (e.type === 'in' && !onField) {
      lastEntry = e.min;
      onField = true;
    }
  }
  if (onField) total += 90 - lastEntry;

  if (!isTitular && events.every((e) => e.type !== 'in')) return 0;
  return Math.max(total, isTitular ? 1 : 0);
}

// ── Aggregate appearances into PlayerSeason ──────────────────────────────────

// ── Extended approach: carry player name through appearances ─────────────────

interface PlayerAppearanceWithName extends PlayerMatchAppearance {
  nombreJugador: string;
  carne: string;
}

function processMatchWithNames(detail: MatchDetail): PlayerAppearanceWithName[] {
  const resultado = `${detail.golesLocal}-${detail.golesVisitante}`;
  const appearances: PlayerAppearanceWithName[] = [];
  const norm = (s: string) => s.trim().toUpperCase();

  for (const side of ['local', 'visitante'] as const) {
    const esLocal = side === 'local';
    const equipo = esLocal ? detail.local : detail.visitante;
    const rival = esLocal ? detail.visitante : detail.local;
    const titulares = esLocal ? detail.titularesLocal : detail.titularesVisitante;
    const cambios = esLocal ? detail.cambiosLocal : detail.cambiosVisitante;
    const golesDet = esLocal ? detail.golesDetLocal : detail.golesDetVisitante;
    const amonestados = esLocal ? detail.amonestadosLocal : detail.amonestadosVisitante;
    const expulsados = esLocal ? detail.expulsadosLocal : detail.expulsadosVisitante;

    const amoSet = new Set(amonestados.map(norm));
    const expSet = new Set(expulsados.map(norm));
    const golesMap = new Map<string, { goles: number; ec: number }>();
    for (const g of golesDet) {
      const key = norm(g.Nombre);
      const prev = golesMap.get(key) || { goles: 0, ec: 0 };
      prev.goles++;
      golesMap.set(key, prev);
    }

    for (const t of titulares) {
      const name = t.Nombre.trim();
      const nameUpper = norm(name);
      const gData = golesMap.get(nameUpper) || { goles: 0, ec: 0 };
      appearances.push({
        matchId: detail.matchId,
        fecha: detail.fecha,
        equipo,
        rival,
        esLocal,
        resultado,
        titular: true,
        minutosJugados: calcMinutes(name, true, cambios),
        goles: gData.goles,
        golesEnContra: gData.ec,
        amarilla: amoSet.has(nameUpper),
        roja: expSet.has(nameUpper),
        nombreJugador: name,
        carne: t.carne || '',
      });
    }

    for (const c of cambios) {
      const name = c.Jug_Entra.trim();
      const nameUpper = norm(name);
      const gData = golesMap.get(nameUpper) || { goles: 0, ec: 0 };
      appearances.push({
        matchId: detail.matchId,
        fecha: detail.fecha,
        equipo,
        rival,
        esLocal,
        resultado,
        titular: false,
        minutosJugados: calcMinutes(name, false, cambios),
        goles: gData.goles,
        golesEnContra: gData.ec,
        amarilla: amoSet.has(nameUpper),
        roja: expSet.has(nameUpper),
        nombreJugador: name,
        carne: c.CarneEntra || '',
      });
    }
  }

  return appearances;
}

function aggregateWithNames(allAppearances: PlayerAppearanceWithName[]): PlayerSeason[] {
  // Group by carne (player ID) if available, otherwise by normalized name + team
  const byPlayer = new Map<string, PlayerAppearanceWithName[]>();

  for (const app of allAppearances) {
    const key = app.carne
      ? `carne:${app.carne}`
      : `name:${app.equipo.trim().toUpperCase()}__${app.nombreJugador.trim().toUpperCase()}`;
    if (!byPlayer.has(key)) byPlayer.set(key, []);
    byPlayer.get(key)!.push(app);
  }

  const players: PlayerSeason[] = [];

  for (const [, apps] of Array.from(byPlayer.entries())) {
    const nombre = apps[0].nombreJugador;
    const carne = apps[0].carne;

    // Count team appearances to find primary team
    const teamCounts = new Map<string, number>();
    for (const a of apps) {
      teamCounts.set(a.equipo, (teamCounts.get(a.equipo) || 0) + 1);
    }
    const primaryTeam = Array.from(teamCounts.entries()).sort((a, b) => b[1] - a[1])[0][0];
    const equipos = Array.from(teamCounts.keys());

    // Deduplicate by matchId (a player shouldn't appear twice in same match)
    const byMatch = new Map<string, PlayerAppearanceWithName>();
    for (const a of apps) {
      if (!byMatch.has(a.matchId)) byMatch.set(a.matchId, a);
    }
    const uniqueApps = Array.from(byMatch.values());

    const partidos: PlayerMatchAppearance[] = uniqueApps.map((a) => ({
      matchId: a.matchId,
      fecha: a.fecha,
      equipo: a.equipo,
      rival: a.rival,
      esLocal: a.esLocal,
      resultado: a.resultado,
      titular: a.titular,
      minutosJugados: a.minutosJugados,
      goles: a.goles,
      golesEnContra: a.golesEnContra,
      amarilla: a.amarilla,
      roja: a.roja,
    }));

    players.push({
      playerId: carne ? `c-${carne}` : slugify(nombre),
      nombre,
      carne,
      equipo: primaryTeam,
      equipos,
      pj: uniqueApps.length,
      titular: uniqueApps.filter((a) => a.titular).length,
      suplente: uniqueApps.filter((a) => !a.titular).length,
      minutos: uniqueApps.reduce((s, a) => s + a.minutosJugados, 0),
      goles: uniqueApps.reduce((s, a) => s + a.goles, 0),
      golesEnContra: uniqueApps.reduce((s, a) => s + a.golesEnContra, 0),
      amarillas: uniqueApps.filter((a) => a.amarilla).length,
      rojas: uniqueApps.filter((a) => a.roja).length,
      partidos,
    });
  }

  players.sort((a, b) => b.goles - a.goles || b.minutos - a.minutos || a.nombre.localeCompare(b.nombre));
  return players;
}

// ── Main ingestion function ──────────────────────────────────────────────────

export async function ingestPlayerData(
  temporadaId: number,
  torneo: string,
  divisional: string,
  onProgress?: (done: number, total: number, msg: string) => void,
): Promise<PlayerCache> {
  onProgress?.(0, 0, `Obteniendo IDs de partidos para T${temporadaId} ${torneo} Div ${divisional}...`);

  const matchIds = await collectMatchIds(
    String(temporadaId),
    torneo,
    divisional,
    (msg) => onProgress?.(0, 0, msg),
  );

  onProgress?.(0, matchIds.length, `Encontrados ${matchIds.length} partidos. Descargando detalles...`);

  const allAppearances: PlayerAppearanceWithName[] = [];
  const BATCH = 3;

  for (let i = 0; i < matchIds.length; i += BATCH) {
    const batch = matchIds.slice(i, i + BATCH);
    const results = await Promise.all(
      batch.map(async ({ matchId }, idx) => {
        if (idx > 0) await sleep(idx * 100);
        return fetchMatchDetail(matchId);
      }),
    );

    for (const detail of results) {
      if (detail) {
        const apps = processMatchWithNames(detail);
        allAppearances.push(...apps);
      }
    }

    onProgress?.(
      Math.min(i + BATCH, matchIds.length),
      matchIds.length,
      `Procesados ${Math.min(i + BATCH, matchIds.length)}/${matchIds.length} partidos...`,
    );
  }

  onProgress?.(matchIds.length, matchIds.length, 'Agregando estadísticas de jugadores...');

  const players = aggregateWithNames(allAppearances);

  const cache: PlayerCache = {
    temporadaId,
    torneo,
    divisional,
    fetchedAt: new Date().toISOString(),
    players,
  };

  // Save to disk
  const cacheDir = path.join(process.cwd(), '.cache');
  if (!existsSync(cacheDir)) await mkdir(cacheDir, { recursive: true });
  const fileName = `players-t${temporadaId}-${divisional.toLowerCase()}.json`;
  await writeFile(path.join(cacheDir, fileName), JSON.stringify(cache));

  onProgress?.(matchIds.length, matchIds.length, `Listo: ${players.length} jugadores en ${matchIds.length} partidos.`);

  return cache;
}

const TORNEO_PREFIX_MAP: Record<string, string> = {
  'Mayores Masculino': '',
  'Pre Senior': 'ps-',
  'Sub 20': 'sub20-',
  'Sub 18': 'sub18-',
};

const PREFIX_TORNEO_MAP: Record<string, string> = Object.fromEntries(
  Object.entries(TORNEO_PREFIX_MAP).map(([k, v]) => [v, k]),
);

function torneoToPrefix(torneo: string): string {
  return TORNEO_PREFIX_MAP[torneo] ?? torneo.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-';
}

function parseCacheFileName(
  fileName: string,
  temporadaId: number,
): { torneo: string; divisional: string } | null {
  const base = `players-t${temporadaId}-`;
  if (!fileName.startsWith(base) || !fileName.endsWith('.json')) return null;
  const rest = fileName.slice(base.length, -5);
  for (const [prefix, torneo] of Object.entries(PREFIX_TORNEO_MAP)) {
    if (prefix && rest.startsWith(prefix)) {
      return { torneo, divisional: rest.slice(prefix.length).toUpperCase() };
    }
  }
  return { torneo: 'Mayores Masculino', divisional: rest.toUpperCase() };
}

export async function loadPlayerCache(
  temporadaId: number,
  divisional: string,
  torneo = 'Mayores Masculino',
): Promise<PlayerCache | null> {
  try {
    const cacheDir = path.join(process.cwd(), '.cache');
    const prefix = torneoToPrefix(torneo);
    const fileName = `players-t${temporadaId}-${prefix}${divisional.toLowerCase()}.json`;
    const filePath = path.join(cacheDir, fileName);
    if (!existsSync(filePath)) return null;
    const raw = await readFile(filePath, 'utf-8');
    return JSON.parse(raw) as PlayerCache;
  } catch {
    return null;
  }
}

export async function listAvailableTorneos(
  temporadaId: number,
): Promise<string[]> {
  try {
    const cacheDir = path.join(process.cwd(), '.cache');
    if (!existsSync(cacheDir)) return [];
    const { readdirSync } = await import('fs');
    const files = readdirSync(cacheDir).filter(
      (f) => f.startsWith(`players-t${temporadaId}-`) && f.endsWith('.json'),
    );
    const torneos = new Set<string>();
    for (const f of files) {
      const parsed = parseCacheFileName(f, temporadaId);
      if (parsed) torneos.add(parsed.torneo);
    }
    return Array.from(torneos).sort();
  } catch {
    return [];
  }
}

export async function listAvailableDivisionals(
  temporadaId: number,
  torneo = 'Mayores Masculino',
): Promise<string[]> {
  try {
    const cacheDir = path.join(process.cwd(), '.cache');
    if (!existsSync(cacheDir)) return [];
    const { readdirSync } = await import('fs');
    const prefix = torneoToPrefix(torneo);
    const filePrefix = `players-t${temporadaId}-${prefix}`;
    const files = readdirSync(cacheDir).filter(
      (f) => f.startsWith(filePrefix) && f.endsWith('.json'),
    );
    return files
      .map((f) => f.slice(filePrefix.length, -5).toUpperCase())
      .sort();
  } catch {
    return [];
  }
}

export async function loadMergedPlayerCache(
  temporadaId: number,
  torneo = 'Mayores Masculino',
): Promise<PlayerCache | null> {
  const divisionals = await listAvailableDivisionals(temporadaId, torneo);
  if (divisionals.length === 0) return null;

  const allPlayers: PlayerSeason[] = [];
  let latestFetchedAt = '';

  for (const div of divisionals) {
    const cache = await loadPlayerCache(temporadaId, div, torneo);
    if (!cache) continue;
    allPlayers.push(...cache.players);
    if (cache.fetchedAt > latestFetchedAt) latestFetchedAt = cache.fetchedAt;
  }

  const byKey = new Map<string, PlayerSeason>();
  for (const p of allPlayers) {
    const key = p.carne ? `carne:${p.carne}` : `id:${p.playerId}`;
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, p);
    } else {
      const mergedPartidos = [...existing.partidos];
      const existingMatchIds = new Set(existing.partidos.map((m) => m.matchId));
      for (const m of p.partidos) {
        if (!existingMatchIds.has(m.matchId)) mergedPartidos.push(m);
      }
      const equipos = Array.from(new Set([...existing.equipos, ...p.equipos]));
      const teamCounts = new Map<string, number>();
      for (const m of mergedPartidos) {
        teamCounts.set(m.equipo, (teamCounts.get(m.equipo) || 0) + 1);
      }
      const primaryTeam = Array.from(teamCounts.entries()).sort(
        (a, b) => b[1] - a[1],
      )[0][0];

      byKey.set(key, {
        ...existing,
        equipo: primaryTeam,
        equipos,
        pj: mergedPartidos.length,
        titular: mergedPartidos.filter((m) => m.titular).length,
        suplente: mergedPartidos.filter((m) => !m.titular).length,
        minutos: mergedPartidos.reduce((s, m) => s + m.minutosJugados, 0),
        goles: mergedPartidos.reduce((s, m) => s + m.goles, 0),
        golesEnContra: mergedPartidos.reduce((s, m) => s + m.golesEnContra, 0),
        amarillas: mergedPartidos.filter((m) => m.amarilla).length,
        rojas: mergedPartidos.filter((m) => m.roja).length,
        partidos: mergedPartidos,
      });
    }
  }

  const players = Array.from(byKey.values());
  players.sort(
    (a, b) =>
      b.goles - a.goles || b.minutos - a.minutos || a.nombre.localeCompare(b.nombre),
  );

  return {
    temporadaId,
    torneo,
    divisional: 'TODAS',
    fetchedAt: latestFetchedAt,
    players,
  };
}

