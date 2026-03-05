import { NextRequest, NextResponse } from 'next/server';
import { loadPlayerCache } from '@/lib/ingestPlayers';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const temporada = parseInt(searchParams.get('temporada') || '112');
  const divisional = (searchParams.get('divisional') || 'A').toUpperCase();

  const cache = await loadPlayerCache(temporada, divisional);
  if (!cache) {
    return NextResponse.json(
      { error: `No hay datos de jugadores para T${temporada} Div ${divisional}. Ejecutá la ingesta primero.` },
      { status: 404 },
    );
  }

  return NextResponse.json(cache);
}
