// ── Roles ──────────────────────────────────────────────
export type PlanillaRole = 'team' | 'admin';

export interface PlanillaSession {
  role: PlanillaRole;
  teamId?: string;
  teamName?: string;
}

// ── Match (created by admin) ───────────────────────────
export type MatchStatus =
  | 'pending'
  | 'submitted_one'
  | 'submitted_both'
  | 'validated'
  | 'published';

export interface PlanillaMatch {
  id: string;
  fecha: string; // ISO date
  hora: string;
  cancha: string;
  divisional: string;
  torneo: string;
  equipoLocalId: string;
  equipoLocalNombre: string;
  equipoVisitanteId: string;
  equipoVisitanteNombre: string;
  status: MatchStatus;
  createdAt: string;
}

// ── Roster ─────────────────────────────────────────────
export interface RosterPlayer {
  carne: string;
  camiseta: number;
  nombre: string;
  esTitular: boolean; // true = titular, false = suplente
  firma: boolean;
  fotoFilename?: string; // photo signature filename (stored in data/planillas/photos/)
}

// ── Events ─────────────────────────────────────────────
export type EventType = 'gol' | 'amarilla' | 'roja' | 'cambio';

export interface MatchEvent {
  id: string;
  type: EventType;
  minuto: number;
  jugadorCarne: string;
  jugadorNombre: string;
  // gol
  enContra?: boolean;
  // cambio
  jugadorSaleCarne?: string;
  jugadorSaleNombre?: string;
  jugadorEntraCarne?: string;
  jugadorEntraNombre?: string;
  jugadorEntraCamiseta?: number;
}

// ── Submission (one per team per match) ────────────────
export type SubmissionStatus = 'draft' | 'submitted';

export interface MatchSubmission {
  id: string; // "{matchId}-{teamId}"
  matchId: string;
  teamId: string;
  teamName: string;
  status: SubmissionStatus;
  // perspective
  rival: string;
  esLocal: boolean;
  // result
  golesClub: number;
  golesRival: number;
  // staff
  dtNombre: string;
  dtCI: string;
  dtFirma: boolean;
  // captain
  capitanCarne: string;
  // roster & events
  roster: RosterPlayer[];
  events: MatchEvent[];
  // extra
  observaciones: string;
  // audit
  submittedBy: string;
  submittedAt: string | null;
  updatedAt: string;
}

// ── Discrepancy ────────────────────────────────────────
export interface Discrepancy {
  id: string;
  field: string;
  description: string;
  localValue: string;
  visitanteValue: string;
  resolvedValue?: string;
  resolvedBy?: string;
}

// ── Validation ─────────────────────────────────────────
export type ValidationStatus = 'pending' | 'validated' | 'published';

export interface MatchValidation {
  matchId: string;
  status: ValidationStatus;
  discrepancies: Discrepancy[];
  officialGolesLocal: number;
  officialGolesVisitante: number;
  officialRosterLocal: RosterPlayer[];
  officialRosterVisitante: RosterPlayer[];
  officialEvents: MatchEvent[];
  validatedBy: string | null;
  validatedAt: string | null;
  publishedAt: string | null;
}

// ── Validation issues (soft warnings) ──────────────────
export type IssueSeverity = 'warning' | 'error';

export interface ValidationIssue {
  field: string;
  message: string;
  severity: IssueSeverity;
}

// ── Player option for autocomplete ─────────────────────
export interface PlayerOption {
  playerId: string;
  nombre: string;
  carne: string;
  equipo: string;
}
