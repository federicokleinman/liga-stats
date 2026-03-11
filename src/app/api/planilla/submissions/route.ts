import { NextRequest, NextResponse } from 'next/server';
import {
  loadSubmission,
  saveSubmission,
  loadMatch,
  saveMatch,
  loadBothSubmissions,
} from '@/lib/planilla/storage';
import { validateSubmission } from '@/lib/planilla/validation';
import { compareSubmissions } from '@/lib/planilla/comparison';
import { saveValidation } from '@/lib/planilla/storage';
import type { MatchSubmission, MatchValidation } from '@/lib/planilla/types';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const matchId = searchParams.get('matchId');
  const role = request.headers.get('x-planilla-role');
  const teamId = request.headers.get('x-planilla-team-id');

  if (!matchId) {
    return NextResponse.json({ error: 'matchId requerido' }, { status: 400 });
  }

  if (role === 'team' && teamId) {
    const submission = await loadSubmission(matchId, teamId);
    return NextResponse.json({ submission });
  }

  // Admin can load both
  if (role === 'admin') {
    const match = await loadMatch(matchId);
    if (!match) {
      return NextResponse.json({ error: 'Partido no encontrado' }, { status: 404 });
    }
    const both = await loadBothSubmissions(matchId, match);
    return NextResponse.json(both);
  }

  return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
}

export async function POST(request: NextRequest) {
  const role = request.headers.get('x-planilla-role');
  const teamId = request.headers.get('x-planilla-team-id');

  if (role !== 'team' || !teamId) {
    return NextResponse.json({ error: 'Solo equipos pueden enviar planillas' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const submission = body as MatchSubmission;

    // Verify team owns this submission
    if (submission.teamId !== teamId) {
      return NextResponse.json({ error: 'No podés editar la planilla de otro equipo' }, { status: 403 });
    }

    // Verify match exists
    const match = await loadMatch(submission.matchId);
    if (!match) {
      return NextResponse.json({ error: 'Partido no encontrado' }, { status: 404 });
    }

    // Don't allow edit if already validated/published
    if (match.status === 'validated' || match.status === 'published') {
      return NextResponse.json({ error: 'El partido ya fue validado' }, { status: 400 });
    }

    // Validate
    const issues = validateSubmission(submission);

    submission.id = `${submission.matchId}-${submission.teamId}`;
    submission.updatedAt = new Date().toISOString();

    await saveSubmission(submission);

    return NextResponse.json({ submission, issues });
  } catch {
    return NextResponse.json({ error: 'Error al guardar planilla' }, { status: 500 });
  }
}

/** PUT to submit (change status from draft to submitted) */
export async function PUT(request: NextRequest) {
  const role = request.headers.get('x-planilla-role');
  const teamId = request.headers.get('x-planilla-team-id');

  if (role !== 'team' || !teamId) {
    return NextResponse.json({ error: 'Solo equipos pueden enviar planillas' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const matchId = searchParams.get('matchId');
    if (!matchId) {
      return NextResponse.json({ error: 'matchId requerido' }, { status: 400 });
    }

    const submission = await loadSubmission(matchId, teamId);
    if (!submission) {
      return NextResponse.json({ error: 'Planilla no encontrada' }, { status: 404 });
    }

    const match = await loadMatch(matchId);
    if (!match) {
      return NextResponse.json({ error: 'Partido no encontrado' }, { status: 404 });
    }

    if (match.status === 'validated' || match.status === 'published') {
      return NextResponse.json({ error: 'El partido ya fue validado' }, { status: 400 });
    }

    // Mark as submitted
    submission.status = 'submitted';
    submission.submittedAt = new Date().toISOString();
    submission.submittedBy = teamId;
    await saveSubmission(submission);

    // Check if both teams have submitted
    const both = await loadBothSubmissions(matchId, match);
    const localSubmitted = both.local?.status === 'submitted';
    const visitanteSubmitted = both.visitante?.status === 'submitted';

    if (localSubmitted && visitanteSubmitted) {
      match.status = 'submitted_both';
      await saveMatch(match);

      // Auto-compare
      const discrepancies = compareSubmissions(both.local!, both.visitante!, match);

      const validation: MatchValidation = {
        matchId,
        status: 'pending',
        discrepancies,
        officialGolesLocal: both.local!.golesClub,
        officialGolesVisitante: both.visitante!.golesClub,
        officialRosterLocal: both.local!.roster,
        officialRosterVisitante: both.visitante!.roster,
        officialEvents: [...both.local!.events],
        validatedBy: null,
        validatedAt: null,
        publishedAt: null,
      };
      await saveValidation(validation);
    } else if (match.status === 'pending') {
      match.status = 'submitted_one';
      await saveMatch(match);
    }

    return NextResponse.json({
      submission,
      matchStatus: match.status,
      bothSubmitted: localSubmitted && visitanteSubmitted,
    });
  } catch {
    return NextResponse.json({ error: 'Error al enviar planilla' }, { status: 500 });
  }
}
