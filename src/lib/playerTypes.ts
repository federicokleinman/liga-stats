export interface PlayerMatchAppearance {
  matchId: string;
  fecha: string;
  equipo: string;
  rival: string;
  esLocal: boolean;
  resultado: string; // "2-1"
  titular: boolean;
  minutosJugados: number;
  goles: number;
  golesEnContra: number;
  amarilla: boolean;
  roja: boolean;
}

export interface PlayerSeason {
  playerId: string;
  nombre: string;
  carne: string;
  equipo: string; // primary team (most appearances)
  equipos: string[];
  pj: number;
  titular: number;
  suplente: number;
  minutos: number;
  goles: number;
  golesEnContra: number;
  amarillas: number;
  rojas: number;
  partidos: PlayerMatchAppearance[];
}

export interface PlayerCache {
  temporadaId: number;
  torneo: string;
  divisional: string;
  fetchedAt: string;
  players: PlayerSeason[];
}

/** A single season entry in a player's career timeline */
export interface CareerEntry {
  temporadaId: number;
  year: number;
  equipo: string;
  divisional: string;
  pj: number;
  titular: number;
  suplente: number;
  minutos: number;
  goles: number;
  amarillas: number;
  rojas: number;
}

/** Full career data for a player across multiple seasons */
export interface PlayerCareer {
  playerId: string;
  nombre: string;
  carne: string;
  seasons: CareerEntry[];
  totalPJ: number;
  totalGoles: number;
  totalMinutos: number;
  equipos: string[]; // unique teams in chronological order
}
