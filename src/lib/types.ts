export interface StandingRow {
  temporadaId: number;
  torneo: string;
  divisional: string; // letter (A-I) for most torneos; number (1-4) for SUB 18 / MÁS 40
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
  torneos: string[];
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
  torneos: string[];
}

export interface IngestStatus {
  status: 'idle' | 'running' | 'done' | 'error';
  message: string;
  progress?: number;
  total?: number;
}

// Canonical torneo names as used in the API
export const TORNEO_NAMES = {
  MAYORES: 'Mayores Masculino',
  PRE_SENIOR: 'PRE SENIOR',
  SUB_20: 'Sub - 20',
  SUB_18: 'SUB 18 ',
  MAS_40: 'MÁS 40',
} as const;

export type TorneoName = (typeof TORNEO_NAMES)[keyof typeof TORNEO_NAMES];

export const TORNEO_DISPLAY: Record<string, string> = {
  'Mayores Masculino': 'Mayores',
  'PRE SENIOR': 'Pre Senior',
  'Sub - 20': 'Sub 20',
  'SUB 18 ': 'Sub 18',
  'MÁS 40': 'Más 40',
};

export const ALL_TORNEOS = Object.values(TORNEO_NAMES);
