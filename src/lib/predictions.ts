import { StandingRow, PredictionResult, PredictionOutput, temporadaToYear } from './types';

// ── Config ──────────────────────────────────────────────────────────────
const DECAY = 0.7;
const SIMULATIONS = 10_000;
const DIV_B_PENALTY = 0.6;
const DEFAULT_STD_DEV = 0.8;
const MIN_SEASONS_FOR_VARIANCE = 3;
const PROMOTION_SLOTS = 4;
const RELEGATION_SLOTS = 4;
const TORNEO = 'Mayores Masculino';

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

// ── Step 1: Determine T(latest+1) Div A roster ─────────────────────────
interface RosterTeam {
  teamId: string;
  nombre: string;
  fromDivB: boolean;
}

function determineDivARoster(rows: StandingRow[], latestTemp: number): RosterTeam[] {
  const divA = rows
    .filter((r) => r.torneo === TORNEO && r.divisional === 'A' && r.temporadaId === latestTemp)
    .sort((a, b) => a.posicion - b.posicion);

  const divB = rows
    .filter((r) => r.torneo === TORNEO && r.divisional === 'B' && r.temporadaId === latestTemp)
    .sort((a, b) => a.posicion - b.posicion);

  // Teams that stay (not bottom 4)
  const stay = divA.slice(0, -RELEGATION_SLOTS).map((r) => ({
    teamId: r.teamId,
    nombre: r.equipoNombreNormalizado,
    fromDivB: false,
  }));

  // Teams promoted from Div B (top 4)
  const promoted = divB.slice(0, PROMOTION_SLOTS).map((r) => ({
    teamId: r.teamId,
    nombre: r.equipoNombreNormalizado,
    fromDivB: true,
  }));

  return [...stay, ...promoted];
}

// ── Step 2: Compute power ratings ───────────────────────────────────────
interface PowerRating {
  teamId: string;
  nombre: string;
  fromDivB: boolean;
  rating: number;
  stdDev: number;
}

function computePowerRatings(
  rows: StandingRow[],
  roster: RosterTeam[],
  latestTemp: number,
): PowerRating[] {
  // Get all Div A seasons for z-score normalization
  const divARows = rows.filter((r) => r.torneo === TORNEO && r.divisional === 'A');
  const divBRows = rows.filter((r) => r.torneo === TORNEO && r.divisional === 'B');

  // Group by temporada for z-score computation
  const byTemp = new Map<number, StandingRow[]>();
  for (const r of divARows) {
    if (!byTemp.has(r.temporadaId)) byTemp.set(r.temporadaId, []);
    byTemp.get(r.temporadaId)!.push(r);
  }

  const byTempB = new Map<number, StandingRow[]>();
  for (const r of divBRows) {
    if (!byTempB.has(r.temporadaId)) byTempB.set(r.temporadaId, []);
    byTempB.get(r.temporadaId)!.push(r);
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

    const source = team.fromDivB ? byTempB : byTemp;
    const penalty = team.fromDivB ? DIV_B_PENALTY : 1;

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
      fromDivB: team.fromDivB,
      rating,
      stdDev,
    };
  });
}

// ── Step 3: Monte Carlo simulation ──────────────────────────────────────
function runSimulation(ratings: PowerRating[]): Map<string, { champion: number; top4: number; bottom4: number; posSum: number }> {
  const counts = new Map<string, { champion: number; top4: number; bottom4: number; posSum: number }>();
  for (const r of ratings) {
    counts.set(r.teamId, { champion: 0, top4: 0, bottom4: 0, posSum: 0 });
  }

  const rng = mulberry32(2026); // fixed seed for reproducibility
  const n = ratings.length;

  for (let sim = 0; sim < SIMULATIONS; sim++) {
    // Sample performance for each team
    const sampled = ratings.map((r) => ({
      teamId: r.teamId,
      performance: r.rating + r.stdDev * normalRandom(rng),
    }));

    // Rank by performance (higher = better)
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
export function computePredictions(rows: StandingRow[]): PredictionOutput {
  const mayoresRows = rows.filter((r) => r.torneo === TORNEO);
  const latestTemp = Math.max(...mayoresRows.map((r) => r.temporadaId));

  const roster = determineDivARoster(rows, latestTemp);
  const ratings = computePowerRatings(rows, roster, latestTemp);
  const simResults = runSimulation(ratings);

  const teams: PredictionResult[] = ratings.map((r) => {
    const sim = simResults.get(r.teamId)!;
    return {
      teamId: r.teamId,
      nombre: r.nombre,
      fromDivB: r.fromDivB,
      powerRating: Math.round(r.rating * 100) / 100,
      pChampion: Math.round((sim.champion / SIMULATIONS) * 1000) / 1000,
      pTop4: Math.round((sim.top4 / SIMULATIONS) * 1000) / 1000,
      pBottom4: Math.round((sim.bottom4 / SIMULATIONS) * 1000) / 1000,
      avgPosition: Math.round((sim.posSum / SIMULATIONS) * 10) / 10,
    };
  });

  // Sort by champion probability descending, then avgPosition ascending
  teams.sort((a, b) => b.pChampion - a.pChampion || a.avgPosition - b.avgPosition);

  return {
    targetTemporada: latestTemp + 1,
    targetYear: temporadaToYear(latestTemp + 1),
    basedOnTemporada: latestTemp,
    teams,
  };
}
