import { NextRequest, NextResponse } from 'next/server';
import {
  loadValidation,
  saveValidation,
  loadMatch,
  saveMatch,
  loadBothSubmissions,
} from '@/lib/planilla/storage';
import { compareSubmissions } from '@/lib/planilla/comparison';
import type { MatchValidation } from '@/lib/planilla/types';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const matchId = searchParams.get('matchId');
  if (!matchId) {
    return NextResponse.json({ error: 'matchId requerido' }, { status: 400 });
  }

  const match = await loadMatch(matchId);
  if (!match) {
    return NextResponse.json({ error: 'Partido no encontrado' }, { status: 404 });
  }

  const both = await loadBothSubmissions(matchId, match);
  const validation = await loadValidation(matchId);

  // Recompute discrepancies if both submitted
  let discrepancies = validation?.discrepancies || [];
  if (both.local && both.visitante) {
    discrepancies = compareSubmissions(both.local, both.visitante, match);
  }

  return NextResponse.json({
    match,
    local: both.local,
    visitante: both.visitante,
    validation: validation ? { ...validation, discrepancies } : null,
    discrepancies,
  });
}

/** POST: save resolved validation */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = body as MatchValidation;

    if (!validation.matchId) {
      return NextResponse.json({ error: 'matchId requerido' }, { status: 400 });
    }

    validation.validatedBy = 'admin';
    validation.validatedAt = new Date().toISOString();
    validation.status = 'validated';
    await saveValidation(validation);

    // Update match status
    const match = await loadMatch(validation.matchId);
    if (match) {
      match.status = 'validated';
      await saveMatch(match);
    }

    return NextResponse.json({ validation });
  } catch {
    return NextResponse.json({ error: 'Error al validar' }, { status: 500 });
  }
}

/** PUT: publish validated match */
export async function PUT(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const matchId = searchParams.get('matchId');

  if (!matchId) {
    return NextResponse.json({ error: 'matchId requerido' }, { status: 400 });
  }

  const validation = await loadValidation(matchId);
  if (!validation) {
    return NextResponse.json({ error: 'No hay validación para este partido' }, { status: 404 });
  }

  if (validation.status !== 'validated') {
    return NextResponse.json({ error: 'El partido debe estar validado primero' }, { status: 400 });
  }

  validation.status = 'published';
  validation.publishedAt = new Date().toISOString();
  await saveValidation(validation);

  const match = await loadMatch(matchId);
  if (match) {
    match.status = 'published';
    await saveMatch(match);
  }

  return NextResponse.json({ validation, match });
}
