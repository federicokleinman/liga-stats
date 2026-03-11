import { readFile, writeFile, mkdir, rename, readdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import type { PlanillaMatch, MatchSubmission, MatchValidation } from './types';

const DATA_DIR = path.join(process.cwd(), 'data', 'planillas');
const MATCHES_FILE = path.join(DATA_DIR, 'matches.json');
const SUBMISSIONS_DIR = path.join(DATA_DIR, 'submissions');
const VALIDATIONS_DIR = path.join(DATA_DIR, 'validations');

async function ensureDir(dir: string) {
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }
}

async function ensureAllDirs() {
  await ensureDir(DATA_DIR);
  await ensureDir(SUBMISSIONS_DIR);
  await ensureDir(VALIDATIONS_DIR);
}

/** Atomic write: write to .tmp then rename */
async function atomicWrite(filePath: string, data: string) {
  const tmp = filePath + '.tmp';
  await writeFile(tmp, data, 'utf-8');
  await rename(tmp, filePath);
}

// ── Matches ────────────────────────────────────────────

export async function loadMatches(): Promise<PlanillaMatch[]> {
  try {
    await ensureAllDirs();
    if (!existsSync(MATCHES_FILE)) return [];
    const raw = await readFile(MATCHES_FILE, 'utf-8');
    return JSON.parse(raw) as PlanillaMatch[];
  } catch {
    return [];
  }
}

export async function saveMatches(matches: PlanillaMatch[]): Promise<void> {
  await ensureAllDirs();
  await atomicWrite(MATCHES_FILE, JSON.stringify(matches, null, 2));
}

export async function loadMatch(matchId: string): Promise<PlanillaMatch | null> {
  const matches = await loadMatches();
  return matches.find((m) => m.id === matchId) ?? null;
}

export async function saveMatch(match: PlanillaMatch): Promise<void> {
  const matches = await loadMatches();
  const idx = matches.findIndex((m) => m.id === match.id);
  if (idx >= 0) {
    matches[idx] = match;
  } else {
    matches.push(match);
  }
  await saveMatches(matches);
}

// ── Submissions ────────────────────────────────────────

function submissionPath(matchId: string, teamId: string): string {
  return path.join(SUBMISSIONS_DIR, `${matchId}--${teamId}.json`);
}

export async function loadSubmission(
  matchId: string,
  teamId: string,
): Promise<MatchSubmission | null> {
  try {
    await ensureAllDirs();
    const fp = submissionPath(matchId, teamId);
    if (!existsSync(fp)) return null;
    const raw = await readFile(fp, 'utf-8');
    return JSON.parse(raw) as MatchSubmission;
  } catch {
    return null;
  }
}

export async function saveSubmission(submission: MatchSubmission): Promise<void> {
  await ensureAllDirs();
  const fp = submissionPath(submission.matchId, submission.teamId);
  await atomicWrite(fp, JSON.stringify(submission, null, 2));
}

export async function loadBothSubmissions(
  matchId: string,
  match: PlanillaMatch,
): Promise<{ local: MatchSubmission | null; visitante: MatchSubmission | null }> {
  const [local, visitante] = await Promise.all([
    loadSubmission(matchId, match.equipoLocalId),
    loadSubmission(matchId, match.equipoVisitanteId),
  ]);
  return { local, visitante };
}

export async function loadAllSubmissionsForMatch(
  matchId: string,
): Promise<MatchSubmission[]> {
  await ensureAllDirs();
  const files = await readdir(SUBMISSIONS_DIR);
  const results: MatchSubmission[] = [];
  for (const file of files) {
    if (file.startsWith(`${matchId}--`) && file.endsWith('.json')) {
      const raw = await readFile(path.join(SUBMISSIONS_DIR, file), 'utf-8');
      results.push(JSON.parse(raw) as MatchSubmission);
    }
  }
  return results;
}

// ── Validations ────────────────────────────────────────

function validationPath(matchId: string): string {
  return path.join(VALIDATIONS_DIR, `${matchId}.json`);
}

export async function loadValidation(matchId: string): Promise<MatchValidation | null> {
  try {
    await ensureAllDirs();
    const fp = validationPath(matchId);
    if (!existsSync(fp)) return null;
    const raw = await readFile(fp, 'utf-8');
    return JSON.parse(raw) as MatchValidation;
  } catch {
    return null;
  }
}

export async function saveValidation(validation: MatchValidation): Promise<void> {
  await ensureAllDirs();
  const fp = validationPath(validation.matchId);
  await atomicWrite(fp, JSON.stringify(validation, null, 2));
}
