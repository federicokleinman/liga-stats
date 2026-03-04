import { NextRequest, NextResponse } from 'next/server';
import { ensureInitialized, getData, getProgress, isReady } from '@/lib/startup';

export async function GET(request: NextRequest) {
  // Kick off initialization (loads from disk cache or auto-ingests)
  // Don't await — let it run in background so we can return status immediately
  ensureInitialized();

  const { searchParams } = request.nextUrl;
  const view = searchParams.get('view') || 'metrics';

  if (view === 'progress') {
    return NextResponse.json(getProgress());
  }

  if (!isReady()) {
    const prog = getProgress();
    return NextResponse.json(
      { error: 'loading', progress: prog },
      { status: 202 },
    );
  }

  const { data, metrics } = getData();

  if (!data || !metrics) {
    return NextResponse.json(
      { error: 'No data available.' },
      { status: 404 },
    );
  }

  switch (view) {
    case 'metrics':
      return NextResponse.json(metrics);

    case 'standings': {
      const tempStr = searchParams.get('temporada');
      const div = searchParams.get('divisional');
      let rows = data.rows;
      if (tempStr) rows = rows.filter((r) => r.temporadaId === parseInt(tempStr));
      if (div) rows = rows.filter((r) => r.divisionalLetra === div.toUpperCase());
      rows = [...rows].sort((a, b) => a.posicion - b.posicion);
      return NextResponse.json({ rows, meta: { fetchedAt: data.fetchedAt, total: rows.length } });
    }

    case 'team': {
      const teamId = searchParams.get('teamId');
      if (!teamId) return NextResponse.json({ error: 'teamId required' }, { status: 400 });
      const summary = metrics.teamSummaries[teamId];
      if (!summary) return NextResponse.json({ error: 'Team not found' }, { status: 404 });
      return NextResponse.json(summary);
    }

    case 'teams':
      return NextResponse.json(metrics.allTeams);

    case 'status':
      return NextResponse.json({
        hasData: true,
        fetchedAt: data.fetchedAt,
        rowCount: data.rows.length,
        teamCount: metrics.allTeams.length,
        temporadaRange: [data.temporadaMin, data.temporadaMax],
        divisionales: data.divisionales,
      });

    default:
      return NextResponse.json({ error: `Unknown view: ${view}` }, { status: 400 });
  }
}
