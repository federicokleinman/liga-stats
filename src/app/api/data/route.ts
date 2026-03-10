import { NextRequest, NextResponse } from 'next/server';
import { ensureInitialized, getData, getProgress, isReady, getMetricsForTorneo, getAllTorneos } from '@/lib/startup';
import { TORNEO_NAMES } from '@/lib/types';
import { computePredictions } from '@/lib/predictions';

const DEFAULT_TORNEO = TORNEO_NAMES.MAYORES;

export async function GET(request: NextRequest) {
  ensureInitialized();

  const { searchParams } = request.nextUrl;
  const view = searchParams.get('view') || 'metrics';

  if (view === 'progress') {
    return NextResponse.json(getProgress());
  }

  if (!isReady()) {
    return NextResponse.json({ error: 'loading', progress: getProgress() }, { status: 202 });
  }

  const { data } = getData();
  const torneo = searchParams.get('torneo') || DEFAULT_TORNEO;

  if (view === 'torneos') {
    return NextResponse.json(getAllTorneos());
  }

  if (!data) {
    return NextResponse.json({ error: 'No data available.' }, { status: 404 });
  }

  switch (view) {
    case 'metrics': {
      const metrics = getMetricsForTorneo(torneo);
      if (!metrics) return NextResponse.json({ error: `No data for torneo: ${torneo}` }, { status: 404 });
      return NextResponse.json(metrics);
    }

    case 'standings': {
      const tempStr = searchParams.get('temporada');
      const div = searchParams.get('divisional');
      let rows = data.rows.filter((r) => r.torneo === torneo);
      if (tempStr) rows = rows.filter((r) => r.temporadaId === parseInt(tempStr));
      if (div) rows = rows.filter((r) => r.divisional === div);
      rows = [...rows].sort((a, b) => a.posicion - b.posicion);
      return NextResponse.json({ rows, meta: { fetchedAt: data.fetchedAt, total: rows.length } });
    }

    case 'team': {
      const teamId = searchParams.get('teamId');
      if (!teamId) return NextResponse.json({ error: 'teamId required' }, { status: 400 });
      const metrics = getMetricsForTorneo(torneo);
      if (!metrics) return NextResponse.json({ error: `No data for torneo: ${torneo}` }, { status: 404 });
      const summary = metrics.teamSummaries[teamId];
      if (!summary) return NextResponse.json({ error: 'Team not found' }, { status: 404 });
      return NextResponse.json(summary);
    }

    case 'teams': {
      const metrics = getMetricsForTorneo(torneo);
      if (!metrics) return NextResponse.json([]);
      return NextResponse.json(metrics.allTeams);
    }

    case 'status':
      return NextResponse.json({
        hasData: true,
        fetchedAt: data.fetchedAt,
        rowCount: data.rows.length,
        torneos: getAllTorneos(),
        temporadaRange: [data.temporadaMin, data.temporadaMax],
        divisionales: data.divisionales,
      });

    case 'predictions': {
      const predictions = computePredictions(data.rows);
      return NextResponse.json(predictions);
    }

    default:
      return NextResponse.json({ error: `Unknown view: ${view}` }, { status: 400 });
  }
}
