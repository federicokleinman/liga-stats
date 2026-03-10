import type { PlayerSeason, PlayerMatchAppearance } from './playerTypes';
import type { KPI } from '@/components/ComparisonBarChart';

export function computeRecord(partidos: PlayerMatchAppearance[]) {
  let w = 0, d = 0, l = 0;
  for (const p of partidos) {
    const [gL, gV] = p.resultado.split('-').map(Number);
    const ge = p.esLocal ? gL : gV;
    const gr = p.esLocal ? gV : gL;
    if (ge > gr) w++;
    else if (ge === gr) d++;
    else l++;
  }
  return { w, d, l };
}

export function buildPlayerKPIs(p1: PlayerSeason, p2: PlayerSeason): KPI[] {
  const r1 = computeRecord(p1.partidos);
  const r2 = computeRecord(p2.partidos);

  const winPct1 = p1.pj > 0 ? (r1.w / p1.pj) * 100 : 0;
  const winPct2 = p2.pj > 0 ? (r2.w / p2.pj) * 100 : 0;

  const titPct1 = p1.pj > 0 ? (p1.titular / p1.pj) * 100 : 0;
  const titPct2 = p2.pj > 0 ? (p2.titular / p2.pj) * 100 : 0;

  const golesPJ1 = p1.pj > 0 ? p1.goles / p1.pj : 0;
  const golesPJ2 = p2.pj > 0 ? p2.goles / p2.pj : 0;

  const minPJ1 = p1.pj > 0 ? p1.minutos / p1.pj : 0;
  const minPJ2 = p2.pj > 0 ? p2.minutos / p2.pj : 0;

  return [
    { label: 'PJ', icon: '📋', v1: p1.pj, v2: p2.pj },
    { label: 'Titular', icon: '🟢', v1: p1.titular, v2: p2.titular },
    { label: 'Suplente', icon: '🔵', v1: p1.suplente, v2: p2.suplente },
    { label: 'Minutos', icon: '⏱', v1: p1.minutos, v2: p2.minutos },
    { label: 'Min/PJ', icon: '⏱', v1: minPJ1, v2: minPJ2, format: (v: number) => v.toFixed(0) },
    { label: 'Goles', icon: '⚽', v1: p1.goles, v2: p2.goles },
    { label: 'Goles/PJ', icon: '⚽', v1: golesPJ1, v2: golesPJ2, format: (v: number) => v.toFixed(2) },
    { label: 'Amarillas', icon: '🟨', v1: p1.amarillas, v2: p2.amarillas, lowerIsBetter: true },
    { label: 'Rojas', icon: '🟥', v1: p1.rojas, v2: p2.rojas, lowerIsBetter: true },
    { label: '% Titular', icon: '📊', v1: titPct1, v2: titPct2, format: (v: number) => `${v.toFixed(0)}%` },
    { label: '% Victoria', icon: '🏆', v1: winPct1, v2: winPct2, format: (v: number) => `${v.toFixed(0)}%` },
  ];
}

/** Subset of labels for the radar chart (balanced mix of metrics) */
export const RADAR_LABELS = ['PJ', 'Goles/PJ', 'Min/PJ', '% Titular', '% Victoria', 'Amarillas'];
