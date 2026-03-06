import { NextRequest, NextResponse } from 'next/server';
import { listAvailableDivisionals, listAvailableTorneos } from '@/lib/ingestPlayers';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const temporada = parseInt(searchParams.get('temporada') || '112');
  const torneo = searchParams.get('torneo') || 'Mayores Masculino';

  const divisionals = await listAvailableDivisionals(temporada, torneo);
  const torneos = await listAvailableTorneos(temporada);
  return NextResponse.json({ temporada, torneo, divisionals, torneos });
}
