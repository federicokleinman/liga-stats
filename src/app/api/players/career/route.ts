import { NextRequest, NextResponse } from 'next/server';
import { loadPlayerCareer } from '@/lib/ingestPlayers';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const playerId = searchParams.get('playerId');
  const torneo = searchParams.get('torneo') || 'Mayores Masculino';
  const divisional = searchParams.get('divisional') || 'A';

  if (!playerId) {
    return NextResponse.json({ error: 'playerId es requerido' }, { status: 400 });
  }

  const career = await loadPlayerCareer(playerId, torneo, divisional);

  if (!career) {
    return NextResponse.json(
      { error: `No se encontró historial para ${playerId}` },
      { status: 404 },
    );
  }

  return NextResponse.json(career);
}
