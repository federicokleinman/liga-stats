import { NextRequest, NextResponse } from 'next/server';
import { listAvailableDivisionals } from '@/lib/ingestPlayers';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const temporada = parseInt(searchParams.get('temporada') || '112');

  const divisionals = await listAvailableDivisionals(temporada);
  return NextResponse.json({ temporada, divisionals });
}
