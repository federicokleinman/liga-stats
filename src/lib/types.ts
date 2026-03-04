export interface StandingRow {
  temporadaId: number;
  divisionalLetra: string;
  equipoNombre: string;
  equipoNombreNormalizado: string;
  teamId: string;
  posicion: number;
  pj: number;
  pg: number;
  pe: number;
  pp: number;
  gf: number;
  gc: number;
  puntos: number;
  diferencia: number;
  extras: Record<string, unknown>;
}

export interface CachedData {
  rows: StandingRow[];
  fetchedAt: string;
  temporadaMin: number;
  temporadaMax: number;
  divisionales: string[];
}

export interface TeamSummary {
  teamId: string;
  nombre: string;
  campeonatos: number;
  temporadas: number;
  totalPuntos: number;
  totalPJ: number;
  totalGF: number;
  totalGC: number;
  promedioPuntos: number;
  mejorPosicion: number;
  divisionalHistory: { temporadaId: number; divisional: string; posicion: number; puntos: number }[];
}

export interface ChampionshipStreak {
  teamId: string;
  nombre: string;
  streak: number;
  divisional: string;
  fromTemporada: number;
  toTemporada: number;
}

export interface BestSeason {
  teamId: string;
  nombre: string;
  temporadaId: number;
  divisional: string;
  puntos: number;
  pj: number;
  pg: number;
  pe: number;
  pp: number;
  gf: number;
  gc: number;
}

export interface AttackDefenseRecord {
  teamId: string;
  nombre: string;
  temporadaId: number;
  divisional: string;
  pj: number;
  value: number;
  gf?: number;
  gc?: number;
}

export interface ConsistencyRecord {
  teamId: string;
  nombre: string;
  temporadas: number;
  promedioPuntos: number;
}

export interface PromotionStreak {
  teamId: string;
  nombre: string;
  streak: number;
  fromTemporada: number;
  toTemporada: number;
  path: string[];
}

export interface ComputedMetrics {
  topChampions: { teamId: string; nombre: string; campeonatos: number }[];
  championshipStreaks: ChampionshipStreak[];
  bestSeasons: BestSeason[];
  bestAttack: AttackDefenseRecord[];
  bestDefense: AttackDefenseRecord[];
  consistency: ConsistencyRecord[];
  promotionStreaks: PromotionStreak[];
  teamSummaries: Record<string, TeamSummary>;
  allTeams: { teamId: string; nombre: string }[];
  allTemporadas: number[];
  divisionales: string[];
}

export interface IngestStatus {
  status: 'idle' | 'running' | 'done' | 'error';
  message: string;
  progress?: number;
  total?: number;
}
