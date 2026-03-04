import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

let aliasMap: Record<string, string> | null = null;

async function loadAliases(): Promise<Record<string, string>> {
  if (aliasMap) return aliasMap;
  const aliasPath = path.join(process.cwd(), 'aliases.json');
  if (!existsSync(aliasPath)) {
    aliasMap = {};
    return aliasMap;
  }
  try {
    const raw = await readFile(aliasPath, 'utf-8');
    aliasMap = JSON.parse(raw);
    return aliasMap!;
  } catch {
    aliasMap = {};
    return aliasMap;
  }
}

export function normalizeSpaces(name: string): string {
  return name.trim().replace(/\s+/g, ' ');
}

export function toTitleCase(str: string): string {
  return str
    .toLowerCase()
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export async function normalizeName(raw: string): Promise<{ original: string; normalized: string; teamId: string }> {
  const aliases = await loadAliases();
  const trimmed = normalizeSpaces(raw);
  const canonical = aliases[trimmed] || trimmed;
  const normalized = toTitleCase(canonical);
  return {
    original: trimmed,
    normalized,
    teamId: slugify(canonical),
  };
}

export function resetAliasCache() {
  aliasMap = null;
}
