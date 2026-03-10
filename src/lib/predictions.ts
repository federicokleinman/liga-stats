import { StandingRow, PredictionResult, PredictionOutput, temporadaToYear } from './types';

// ── Config ──────────────────────────────────────────────────────────────
const DECAY = 0.7;
const SIMULATIONS = 10_000;
const LOWER_DIV_PENALTY = 0.6; // penalty for teams promoted from below
const DEFAULT_STD_DEV = 0.8;
const MIN_SEASONS_FOR_VARIANCE = 3;
const PROMOTION_SLOTS = 4;
const RELEGATION_SLOTS = 4;
const TORNEO = 'Mayores Masculino';
const DIVS = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];

// ── Seeded PRNG (mulberry32) for reproducible results ───────────────────
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Box-Muller transform for normal distribution using seeded rng
function normalRandom(rng: () => number): number {
  const u1 = rng();
  const u2 = rng();
  return Math.sqrt(-2 * Math.log(u1 || 1e-10)) * Math.cos(2 * Math.PI * u2);
}

// ── Step 1: Determine next season roster for a given divisional ─────────
interface RosterTeam {
  teamId: string;
  nombre: string;
  origin: 'stay' | 'promoted' | 'relegated';
  sourceDiv: string;
}

function determineRoster(rows: StandingRow[], latestTemp: number, targetDiv: string): RosterTeam[] {
  const divIndex = DIVS.indexOf(targetDiv);
  const upperDiv = divIndex > 0 ? DIVS[divIndex - 1] : null;
  const lowerDiv = divIndex < DIVS.length - 1 ? DIVS[divIndex + 1] : null;

  const currentRows = rows
    .filter((r) => r.torneo === TORNEO && r.divisional === targetDiv && r.temporadaId === latestTemp)
    .sort((a, b) => a.posicion - b.posicion);

  // Determine which teams stay (not promoted up, not relegated down)
  let stayStart = 0;
  let stayEnd = currentRows.length;

  if (upperDiv) stayStart = PROMOTION_SLOTS; // top N get promoted to upper div
  if (lowerDiv) stayEnd = currentRows.length - RELEGATION_SLOTS; // bottom N relegated to lower div

  // Guard against small divisionals
  stayStart = Math.min(stayStart, currentRows.length);
  stayEnd = Math.max(stayEnd, stayStart);

  const stay = currentRows.slice(stayStart, stayEnd).map((r) => ({
    teamId: r.teamId,
    nombre: r.equipoNombreNormalizado,
    origin: 'stay' as const,
    sourceDiv: targetDiv,
  }));

  // Teams relegated from upper div (bottom N of upper div come down)
  const relegated: RosterTeam[] = [];
  if (upperDiv) {
    const upperRows = rows
      .filter((r) => r.torneo === TORNEO && r.divisional === upperDiv && r.temporadaId === latestTemp)
      .sort((a, b) => a.posicion - b.posicion);
    const relCount = Math.min(RELEGATION_SLOTS, upperRows.length);
    relegated.push(
      ...upperRows.slice(-relCount).map((r) => ({
        teamId: r.teamId,
        nombre: r.equipoNombreNormalizado,
        origin: 'relegated' as const,
        sourceDiv: upperDiv,
      })),
    );
  }

  // Teams promoted from lower div (top N of lower div come up)
  const promoted: RosterTeam[] = [];
  if (lowerDiv) {
    const lowerRows = rows
      .filter((r) => r.torneo === TORNEO && r.divisional === lowerDiv && r.temporadaId === latestTemp)
      .sort((a, b) => a.posicion - b.posicion);
    const promCount = Math.min(PROMOTION_SLOTS, lowerRows.length);
    promoted.push(
      ...lowerRows.slice(0, promCount).map((r) => ({
        teamId: r.teamId,
        nombre: r.equipoNombreNormalizado,
        origin: 'promoted' as const,
        sourceDiv: lowerDiv,
      })),
    );
  }

  return [...relegated, ...stay, ...promoted];
}

// ── Step 2: Compute power ratings ───────────────────────────────────────
interface PowerRating {
  teamId: string;
  nombre: string;
  origin: 'stay' | 'promoted' | 'relegated';
  rating: number;
  stdDev: number;
}

function computePowerRatings(
  rows: StandingRow[],
  roster: RosterTeam[],
  latestTemp: number,
): PowerRating[] {
  // Group rows by divisional and then by temporada for z-score computation
  const byDivTemp = new Map<string, Map<number, StandingRow[]>>();
  for (const r of rows.filter((r) => r.torneo === TORNEO)) {
    if (!byDivTemp.has(r.divisional)) byDivTemp.set(r.divisional, new Map());
    const divMap = byDivTemp.get(r.divisional)!;
    if (!divMap.has(r.temporadaId)) divMap.set(r.temporadaId, []);
    divMap.get(r.temporadaId)!.push(r);
  }

  // Compute z-scores for a set of rows within a season
  function zScoresForSeason(seasonRows: StandingRow[]): Map<string, number> {
    const metrics = seasonRows.map((r) => ({
      teamId: r.teamId,
      ppg: r.puntos / (r.pj || 1),
      gdpg: r.diferencia / (r.pj || 1),
      winRate: r.pg / (r.pj || 1),
    }));

    const mean = (arr: number[]) => arr.reduce((s, v) => s + v, 0) / (arr.length || 1);
    const std = (arr: number[], m: number) => {
      const variance = arr.reduce((s, v) => s + (v - m) ** 2, 0) / (arr.length || 1);
      return Math.sqrt(variance) || 1;
    };

    const ppgs = metrics.map((m) => m.ppg);
    const gdpgs = metrics.map((m) => m.gdpg);
    const winRates = metrics.map((m) => m.winRate);

    const ppgMean = mean(ppgs), ppgStd = std(ppgs, ppgMean);
    const gdpgMean = mean(gdpgs), gdpgStd = std(gdpgs, gdpgMean);
    const wrMean = mean(winRates), wrStd = std(winRates, wrMean);

    const result = new Map<string, number>();
    for (const m of metrics) {
      const z = ((m.ppg - ppgMean) / ppgStd + (m.gdpg - gdpgMean) / gdpgStd + (m.winRate - wrMean) / wrStd) / 3;
      result.set(m.teamId, z);
    }
    return result;
  }

  return roster.map((team) => {
    let weightedSum = 0;
    let weightSum = 0;
    const zValues: number[] = [];

    // Use historical data from the team's source divisional
    const source = byDivTemp.get(team.sourceDiv);
    // Promoted teams get a penalty (coming from weaker division)
    const penalty = team.origin === 'promoted' ? LOWER_DIV_PENALTY : 1;

    if (source) {
      source.forEach((seasonRows, tempId) => {
        const zScores = zScoresForSeason(seasonRows);
        const z = zScores.get(team.teamId);
        if (z !== undefined) {
          const weight = Math.pow(DECAY, latestTemp - tempId) * penalty;
          weightedSum += z * weight;
          weightSum += weight;
          zValues.push(z * penalty);
        }
      });
    }

    const rating = weightSum > 0 ? weightedSum / weightSum : 0;

    // Compute historical variance
    let stdDev = DEFAULT_STD_DEV;
    if (zValues.length >= MIN_SEASONS_FOR_VARIANCE) {
      const meanZ = zValues.reduce((s, v) => s + v, 0) / zValues.length;
      const variance = zValues.reduce((s, v) => s + (v - meanZ) ** 2, 0) / zValues.length;
      stdDev = Math.sqrt(variance) || DEFAULT_STD_DEV;
    }

    return {
      teamId: team.teamId,
      nombre: team.nombre,
      origin: team.origin,
      rating,
      stdDev,
    };
  });
}

// ── Step 3: Monte Carlo simulation ──────────────────────────────────────
function runSimulation(ratings: PowerRating[], seed: number): Map<string, { champion: number; top4: number; bottom4: number; posSum: number }> {
  const counts = new Map<string, { champion: number; top4: number; bottom4: number; posSum: number }>();
  for (const r of ratings) {
    counts.set(r.teamId, { champion: 0, top4: 0, bottom4: 0, posSum: 0 });
  }

  const rng = mulberry32(seed);
  const n = ratings.length;

  for (let sim = 0; sim < SIMULATIONS; sim++) {
    const sampled = ratings.map((r) => ({
      teamId: r.teamId,
      performance: r.rating + r.stdDev * normalRandom(rng),
    }));

    sampled.sort((a, b) => b.performance - a.performance);

    for (let pos = 0; pos < n; pos++) {
      const teamId = sampled[pos].teamId;
      const c = counts.get(teamId)!;
      c.posSum += pos + 1;
      if (pos === 0) c.champion++;
      if (pos < PROMOTION_SLOTS) c.top4++;
      if (pos >= n - RELEGATION_SLOTS) c.bottom4++;
    }
  }

  return counts;
}

// ── Orchestrator ────────────────────────────────────────────────────────
export function computePredictions(rows: StandingRow[], divisional: string = 'A'): PredictionOutput {
  const mayoresRows = rows.filter((r) => r.torneo === TORNEO);
  const latestTemp = Math.max(...mayoresRows.map((r) => r.temporadaId));

  const roster = determineRoster(rows, latestTemp, divisional);
  const ratings = computePowerRatings(rows, roster, latestTemp);

  // Use a different seed per divisional for varied but reproducible results
  const divIndex = DIVS.indexOf(divisional);
  const seed = 2026 + divIndex * 1000;
  const simResults = runSimulation(ratings, seed);

  const teams: PredictionResult[] = ratings.map((r) => {
    const sim = simResults.get(r.teamId)!;
    return {
      teamId: r.teamId,
      nombre: r.nombre,
      origin: r.origin,
      powerRating: Math.round(r.rating * 100) / 100,
      pChampion: Math.round((sim.champion / SIMULATIONS) * 1000) / 1000,
      pTop4: Math.round((sim.top4 / SIMULATIONS) * 1000) / 1000,
      pBottom4: Math.round((sim.bottom4 / SIMULATIONS) * 1000) / 1000,
      avgPosition: Math.round((sim.posSum / SIMULATIONS) * 10) / 10,
    };
  });

  teams.sort((a, b) => b.pChampion - a.pChampion || a.avgPosition - b.avgPosition);

  return {
    targetTemporada: latestTemp + 1,
    targetYear: temporadaToYear(latestTemp + 1),
    basedOnTemporada: latestTemp,
    divisional,
    teams,
  };
}
