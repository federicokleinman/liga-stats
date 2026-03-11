import { NextRequest, NextResponse } from 'next/server';
import { loadMatches, saveMatch } from '@/lib/planilla/storage';
import type { PlanillaMatch } from '@/lib/planilla/types';

export async function GET(request: NextRequest) {
  const role = request.headers.get('x-planilla-role');
  const teamId = request.headers.get('x-planilla-team-id');

  const matches = await loadMatches();

  // Teams only see their own matches
  if (role === 'team' && teamId) {
    const filtered = matches.filter(
      (m) => m.equipoLocalId === teamId || m.equipoVisitanteId === teamId,
    );
    return NextResponse.json({ matches: filtered });
  }

  return NextResponse.json({ matches });
}

export async function POST(request: NextRequest) {
  const role = request.headers.get('x-planilla-role');
  if (role !== 'admin') {
    return NextResponse.json({ error: 'Solo admin puede crear partidos' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const {
      fecha, hora, cancha, divisional, torneo,
      equipoLocalId, equipoLocalNombre,
      equipoVisitanteId, equipoVisitanteNombre,
    } = body as Partial<PlanillaMatch>;

    if (!fecha || !equipoLocalId || !equipoVisitanteId || !equipoLocalNombre || !equipoVisitanteNombre) {
      return NextResponse.json({ error: 'Campos obligatorios faltantes' }, { status: 400 });
    }

    const id = `${fecha}-${equipoLocalId}-vs-${equipoVisitanteId}`;

    const match: PlanillaMatch = {
      id,
      fecha,
      hora: hora || '',
      cancha: cancha || '',
      divisional: divisional || 'A',
      torneo: torneo || 'Mayores Masculino',
      equipoLocalId,
      equipoLocalNombre,
      equipoVisitanteId,
      equipoVisitanteNombre,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    await saveMatch(match);
    return NextResponse.json({ match }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Error al crear partido' }, { status: 500 });
  }
}
