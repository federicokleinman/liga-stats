import { NextResponse } from 'next/server';
import { forceRefresh, getProgress } from '@/lib/startup';

export async function POST() {
  const current = getProgress();
  if (current.status === 'ingesting') {
    return NextResponse.json({ error: 'Ingesta ya en curso', progress: current }, { status: 409 });
  }

  // Start refresh in background
  forceRefresh().catch(() => {});

  return NextResponse.json({
    message: 'Ingesta iniciada en background',
    progress: getProgress(),
  });
}

export async function GET() {
  return NextResponse.json(getProgress());
}
