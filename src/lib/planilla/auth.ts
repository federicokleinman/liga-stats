import { SignJWT, jwtVerify } from 'jose';
import type { PlanillaRole, PlanillaSession } from './types';

const JWT_SECRET_RAW = process.env.PLANILLA_JWT_SECRET || 'liga-planilla-dev-secret-change-me';
const JWT_SECRET = new TextEncoder().encode(JWT_SECRET_RAW);
const COOKIE_NAME = 'planilla-session';
const TOKEN_EXPIRY = '24h';

// ── Credential parsing ─────────────────────────────────

interface TeamCredential {
  teamId: string;
  password: string;
}

function parseTeamCredentials(): TeamCredential[] {
  const raw = process.env.PLANILLA_TEAMS || '';
  if (!raw) return [];
  return raw.split(',').map((entry) => {
    const [teamId, password] = entry.split(':');
    return { teamId: teamId.trim(), password: password?.trim() || '' };
  }).filter((c) => c.teamId && c.password);
}

function getAdminPassword(): string {
  return process.env.PLANILLA_ADMIN_PASSWORD || 'admin';
}

// ── Authentication ─────────────────────────────────────

export async function authenticateTeam(
  teamId: string,
  password: string,
): Promise<string | null> {
  const creds = parseTeamCredentials();
  const match = creds.find((c) => c.teamId === teamId && c.password === password);
  if (!match) return null;
  return signToken({ role: 'team', teamId });
}

export async function authenticateAdmin(password: string): Promise<string | null> {
  if (password !== getAdminPassword()) return null;
  return signToken({ role: 'admin' });
}

// ── JWT ────────────────────────────────────────────────

async function signToken(payload: { role: PlanillaRole; teamId?: string }): Promise<string> {
  return new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime(TOKEN_EXPIRY)
    .setIssuedAt()
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string): Promise<PlanillaSession | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const role = payload.role as PlanillaRole;
    if (role !== 'team' && role !== 'admin') return null;
    return {
      role,
      teamId: (payload.teamId as string) || undefined,
    };
  } catch {
    return null;
  }
}

// ── Cookie helpers ─────────────────────────────────────

export function getCookieName(): string {
  return COOKIE_NAME;
}

export function buildSessionCookie(token: string): string {
  return `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`;
}

export function buildLogoutCookie(): string {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

/** Get list of team IDs that have credentials configured */
export function getConfiguredTeamIds(): string[] {
  return parseTeamCredentials().map((c) => c.teamId);
}
