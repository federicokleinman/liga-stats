import { NextRequest, NextResponse } from 'next/server';
import { ingestPlayerData } from '@/lib/ingestPlayers';
import { TORNEO_NAMES } from '@/lib/types';

let ingesting = false;

export async function POST(request: NextRequest) {
  if (ingesting) {
    return NextResponse.json({ error: 'Ingesta de jugadores ya en curso.' }, { status: 409 });
  }

  const body = await request.json().catch(() => ({}));
  const temporada = parseInt(body.temporada) || 112;
  const divisional = (body.divisional || 'A').toUpperCase();
  const torneo = body.torneo || TORNEO_NAMES.MAYORES;

  ingesting = true;
  try {
    const cache = await ingestPlayerData(temporada, torneo, divisional);
    ingesting = false;
    return NextResponse.json({
      ok: true,
      players: cache.players.length,
      fetchedAt: cache.fetchedAt,
    });
  } catch (err) {
    ingesting = false;
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error en ingesta' },
      { status: 500 },
    );
  }
}
