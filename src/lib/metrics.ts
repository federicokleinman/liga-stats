import type {
  CachedData,
  StandingRow,
  ComputedMetrics,
  TeamSummary,
  ChampionshipStreak,
  BestSeason,
  AttackDefenseRecord,
  ConsistencyRecord,
  PromotionStreak,
} from './types';

const DIV_ORDER = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];

function divRank(letra: string): number {
  const idx = DIV_ORDER.indexOf(letra.toUpperCase());
  return idx === -1 ? 99 : idx;
}

function groupBy<T>(arr: T[], keyFn: (item: T) => string): Record<string, T[]> {
  const map: Record<string, T[]> = {};
  for (const item of arr) {
    const key = keyFn(item);
    if (!map[key]) map[key] = [];
    map[key].push(item);
  }
  return map;
}

function getChampions(rows: StandingRow[]): Map<string, { teamId: string; nombre: string; temporadaId: number; divisional: string }[]> {
  const byTD = groupBy(rows, (r) => `${r.temporadaId}|${r.divisionalLetra}`);
  const champMap = new Map<string, { teamId: string; nombre: string; temporadaId: number; divisional: string }[]>();

  for (const [key, group] of Object.entries(byTD)) {
    const sorted = [...group].sort((a, b) => b.puntos - a.puntos || (b.gf - b.gc) - (a.gf - a.gc));
    if (sorted.length === 0) continue;
    const winner = sorted[0];
    const [tStr, div] = key.split('|');
    if (!champMap.has(winner.teamId)) champMap.set(winner.teamId, []);
    champMap.get(winner.teamId)!.push({
      teamId: winner.teamId,
      nombre: winner.equipoNombreNormalizado,
      temporadaId: parseInt(tStr),
      divisional: div,
    });
  }
  return champMap;
}

function computeTopChampions(champMap: Map<string, { teamId: string; nombre: string }[]>): ComputedMetrics['topChampions'] {
  const list = Array.from(champMap.entries()).map(([teamId, wins]) => ({
    teamId,
    nombre: wins[0].nombre,
    campeonatos: wins.length,
  }));
  list.sort((a, b) => b.campeonatos - a.campeonatos);
  return list.slice(0, 10);
}

function computeChampionshipStreaks(
  champMap: Map<string, { teamId: string; nombre: string; temporadaId: number; divisional: string }[]>,
): ChampionshipStreak[] {
  const allStreaks: ChampionshipStreak[] = [];
  const entries = Array.from(champMap.entries());

  for (const [teamId, wins] of entries) {
    const byDiv = groupBy(wins, (w) => w.divisional);
    for (const [div, divWins] of Object.entries(byDiv)) {
      const seasons = divWins.map((w) => w.temporadaId).sort((a, b) => a - b);
      let streak = 1;
      let start = seasons[0];
      let bestStreak = 1;
      let bestStart = seasons[0];
      let bestEnd = seasons[0];

      for (let i = 1; i < seasons.length; i++) {
        if (seasons[i] === seasons[i - 1] + 1) {
          streak++;
          if (streak > bestStreak) {
            bestStreak = streak;
            bestStart = start;
            bestEnd = seasons[i];
          }
        } else {
          streak = 1;
          start = seasons[i];
        }
      }

      if (bestStreak >= 2) {
        allStreaks.push({
          teamId,
          nombre: divWins[0].nombre,
          streak: bestStreak,
          divisional: div,
          fromTemporada: bestStart,
          toTemporada: bestEnd,
        });
      }
    }
  }

  allStreaks.sort((a, b) => b.streak - a.streak);
  return allStreaks.slice(0, 10);
}

function computeBestSeasons(rows: StandingRow[]): BestSeason[] {
  const list = rows.map((r) => ({
    teamId: r.teamId,
    nombre: r.equipoNombreNormalizado,
    temporadaId: r.temporadaId,
    divisional: r.divisionalLetra,
    puntos: r.puntos,
    pj: r.pj,
    pg: r.pg,
    pe: r.pe,
    pp: r.pp,
    gf: r.gf,
    gc: r.gc,
  }));
  list.sort((a, b) => b.puntos - a.puntos);
  return list.slice(0, 10);
}

function computeBestAttack(rows: StandingRow[]): AttackDefenseRecord[] {
  const valid = rows.filter((r) => r.pj > 0);
  const mapped = valid.map((r) => ({
    teamId: r.teamId,
    nombre: r.equipoNombreNormalizado,
    temporadaId: r.temporadaId,
    divisional: r.divisionalLetra,
    pj: r.pj,
    value: r.gf / r.pj,
    gf: r.gf,
  }));
  mapped.sort((a, b) => b.value - a.value);
  return mapped.slice(0, 10);
}

function computeBestDefense(rows: StandingRow[]): AttackDefenseRecord[] {
  const valid = rows.filter((r) => r.pj > 0);
  const mapped = valid.map((r) => ({
    teamId: r.teamId,
    nombre: r.equipoNombreNormalizado,
    temporadaId: r.temporadaId,
    divisional: r.divisionalLetra,
    pj: r.pj,
    value: r.gc / r.pj,
    gc: r.gc,
  }));
  mapped.sort((a, b) => a.value - b.value);
  return mapped.slice(0, 10);
}

function computeConsistency(rows: StandingRow[], minSeasons: number): ConsistencyRecord[] {
  const byTeam = groupBy(rows, (r) => r.teamId);
  const list: ConsistencyRecord[] = [];

  for (const [teamId, teamRows] of Object.entries(byTeam)) {
    const uniqueSeasons = new Set(teamRows.map((r) => `${r.temporadaId}|${r.divisionalLetra}`));
    if (uniqueSeasons.size < minSeasons) continue;
    const totalPts = teamRows.reduce((s, r) => s + r.puntos, 0);
    list.push({
      teamId,
      nombre: teamRows[0].equipoNombreNormalizado,
      temporadas: uniqueSeasons.size,
      promedioPuntos: totalPts / uniqueSeasons.size,
    });
  }

  list.sort((a, b) => b.promedioPuntos - a.promedioPuntos);
  return list.slice(0, 10);
}

function computeTeamSummaries(rows: StandingRow[], champMap: Map<string, { temporadaId: number; divisional: string }[]>): Record<string, TeamSummary> {
  const byTeam = groupBy(rows, (r) => r.teamId);
  const summaries: Record<string, TeamSummary> = {};

  for (const [teamId, teamRows] of Object.entries(byTeam)) {
    const campeonatos = champMap.get(teamId)?.length || 0;
    const uniqueSeasons = new Set(teamRows.map((r) => `${r.temporadaId}|${r.divisionalLetra}`));
    const totalPuntos = teamRows.reduce((s, r) => s + r.puntos, 0);
    const totalPJ = teamRows.reduce((s, r) => s + r.pj, 0);
    const totalGF = teamRows.reduce((s, r) => s + r.gf, 0);
    const totalGC = teamRows.reduce((s, r) => s + r.gc, 0);
    const mejorPosicion = Math.min(...teamRows.map((r) => r.posicion));

    const history = teamRows
      .map((r) => ({
        temporadaId: r.temporadaId,
        divisional: r.divisionalLetra,
        posicion: r.posicion,
        puntos: r.puntos,
      }))
      .sort((a, b) => a.temporadaId - b.temporadaId);

    summaries[teamId] = {
      teamId,
      nombre: teamRows[0].equipoNombreNormalizado,
      campeonatos,
      temporadas: uniqueSeasons.size,
      totalPuntos,
      totalPJ,
      totalGF,
      totalGC,
      promedioPuntos: uniqueSeasons.size > 0 ? totalPuntos / uniqueSeasons.size : 0,
      mejorPosicion,
      divisionalHistory: history,
    };
  }

  return summaries;
}

function computePromotionStreaks(rows: StandingRow[]): PromotionStreak[] {
  const byTeam = groupBy(rows, (r) => r.teamId);
  const allStreaks: PromotionStreak[] = [];

  for (const [teamId, teamRows] of Object.entries(byTeam)) {
    const byTemporada = groupBy(teamRows, (r) => String(r.temporadaId));
    const seasons = Object.keys(byTemporada)
      .map(Number)
      .sort((a, b) => a - b);

    if (seasons.length < 2) continue;

    const seasonBestDiv = new Map<number, string>();
    for (const s of seasons) {
      const divs = byTemporada[String(s)].map((r) => r.divisionalLetra);
      divs.sort((a, b) => divRank(a) - divRank(b));
      seasonBestDiv.set(s, divs[0]);
    }

    let streak = 0;
    let start = seasons[0];
    let path: string[] = [];
    let bestStreak = 0;
    let bestStart = seasons[0];
    let bestPath: string[] = [];

    for (let i = 1; i < seasons.length; i++) {
      const prev = seasonBestDiv.get(seasons[i - 1])!;
      const curr = seasonBestDiv.get(seasons[i])!;

      if (seasons[i] === seasons[i - 1] + 1 && divRank(curr) < divRank(prev)) {
        if (streak === 0) {
          streak = 1;
          start = seasons[i - 1];
          path = [prev, curr];
        } else {
          streak++;
          path.push(curr);
        }
        if (streak > bestStreak) {
          bestStreak = streak;
          bestStart = start;
          bestPath = [...path];
        }
      } else {
        streak = 0;
        path = [];
      }
    }

    if (bestStreak >= 1) {
      allStreaks.push({
        teamId,
        nombre: teamRows[0].equipoNombreNormalizado,
        streak: bestStreak,
        fromTemporada: bestStart,
        toTemporada: bestStart + bestStreak,
        path: bestPath,
      });
    }
  }

  allStreaks.sort((a, b) => b.streak - a.streak);
  return allStreaks.slice(0, 10);
}

export function computeAllMetrics(data: CachedData): ComputedMetrics {
  const { rows } = data;
  const minConsistencySeasons = parseInt(process.env.MIN_CONSISTENCY_SEASONS || '5', 10);

  const champMap = getChampions(rows);
  const topChampions = computeTopChampions(champMap);
  const championshipStreaks = computeChampionshipStreaks(champMap);
  const bestSeasons = computeBestSeasons(rows);
  const bestAttack = computeBestAttack(rows);
  const bestDefense = computeBestDefense(rows);
  const consistency = computeConsistency(rows, minConsistencySeasons);
  const teamSummaries = computeTeamSummaries(rows, champMap);
  const promotionStreaks = computePromotionStreaks(rows);

  const allTeamMap = new Map<string, string>();
  for (const r of rows) {
    if (!allTeamMap.has(r.teamId)) allTeamMap.set(r.teamId, r.equipoNombreNormalizado);
  }
  const allTeams = Array.from(allTeamMap.entries())
    .map(([teamId, nombre]) => ({ teamId, nombre }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre));

  const allTemporadas = Array.from(new Set(rows.map((r) => r.temporadaId))).sort((a, b) => a - b);
  const divisionales = Array.from(new Set(rows.map((r) => r.divisionalLetra))).sort();

  return {
    topChampions,
    championshipStreaks,
    bestSeasons,
    bestAttack,
    bestDefense,
    consistency,
    promotionStreaks,
    teamSummaries,
    allTeams,
    allTemporadas,
    divisionales,
  };
}
