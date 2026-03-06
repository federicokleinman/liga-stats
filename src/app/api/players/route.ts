import { NextRequest, NextResponse } from 'next/server';
import { loadPlayerCache, loadMergedPlayerCache } from '@/lib/ingestPlayers';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const temporada = parseInt(searchParams.get('temporada') || '112');
  const divisional = (searchParams.get('divisional') || 'A').toUpperCase();
  const torneo = searchParams.get('torneo') || 'Mayores Masculino';

  const cache =
    divisional === 'TODAS'
      ? await loadMergedPlayerCache(temporada, torneo)
      : await loadPlayerCache(temporada, divisional, torneo);

  if (!cache) {
    return NextResponse.json(
      { error: `No hay datos de jugadores para T${temporada} ${torneo} Div ${divisional}. Ejecutá la ingesta primero.` },
      { status: 404 },
    );
  }

  return NextResponse.json(cache);
}
