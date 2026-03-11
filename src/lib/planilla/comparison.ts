import type { MatchSubmission, Discrepancy, PlanillaMatch } from './types';

let discrepancyCounter = 0;
function nextId(): string {
  return `disc-${++discrepancyCounter}-${Date.now()}`;
}

export function compareSubmissions(
  local: MatchSubmission,
  visitante: MatchSubmission,
  match: PlanillaMatch,
): Discrepancy[] {
  discrepancyCounter = 0;
  const discs: Discrepancy[] = [];

  // ── Result comparison ────────────────────────────────
  // Local's golesClub should match Visitante's golesRival and vice versa
  if (local.golesClub !== visitante.golesRival) {
    discs.push({
      id: nextId(),
      field: 'resultado',
      description: `Goles de ${match.equipoLocalNombre}: local dice ${local.golesClub}, visitante dice ${visitante.golesRival}`,
      localValue: String(local.golesClub),
      visitanteValue: String(visitante.golesRival),
    });
  }

  if (local.golesRival !== visitante.golesClub) {
    discs.push({
      id: nextId(),
      field: 'resultado',
      description: `Goles de ${match.equipoVisitanteNombre}: local dice ${local.golesRival}, visitante dice ${visitante.golesClub}`,
      localValue: String(local.golesRival),
      visitanteValue: String(visitante.golesClub),
    });
  }

  // ── Goal events comparison ───────────────────────────
  const localGoals = local.events.filter((e) => e.type === 'gol');
  const visitanteGoals = visitante.events.filter((e) => e.type === 'gol');

  // Compare goals count
  if (localGoals.length !== visitanteGoals.length) {
    discs.push({
      id: nextId(),
      field: 'goles',
      description: 'Diferente cantidad de goles registrados',
      localValue: `${localGoals.length} goles`,
      visitanteValue: `${visitanteGoals.length} goles`,
    });
  }

  // Match goals by player and approximate minute (±3 min tolerance)
  const unmatchedLocal = [...localGoals];
  const unmatchedVisitante = [...visitanteGoals];

  for (let i = unmatchedLocal.length - 1; i >= 0; i--) {
    const lg = unmatchedLocal[i];
    const matchIdx = unmatchedVisitante.findIndex(
      (vg) =>
        vg.jugadorCarne === lg.jugadorCarne &&
        Math.abs(vg.minuto - lg.minuto) <= 3,
    );
    if (matchIdx >= 0) {
      // Check exact minute difference
      const vg = unmatchedVisitante[matchIdx];
      if (vg.minuto !== lg.minuto) {
        discs.push({
          id: nextId(),
          field: 'goles',
          description: `Gol de ${lg.jugadorNombre}: minuto distinto`,
          localValue: `min ${lg.minuto}`,
          visitanteValue: `min ${vg.minuto}`,
        });
      }
      unmatchedLocal.splice(i, 1);
      unmatchedVisitante.splice(matchIdx, 1);
    }
  }

  for (const lg of unmatchedLocal) {
    discs.push({
      id: nextId(),
      field: 'goles',
      description: `Gol registrado solo por local: ${lg.jugadorNombre} (min ${lg.minuto})`,
      localValue: `${lg.jugadorNombre} min ${lg.minuto}`,
      visitanteValue: '—',
    });
  }

  for (const vg of unmatchedVisitante) {
    discs.push({
      id: nextId(),
      field: 'goles',
      description: `Gol registrado solo por visitante: ${vg.jugadorNombre} (min ${vg.minuto})`,
      localValue: '—',
      visitanteValue: `${vg.jugadorNombre} min ${vg.minuto}`,
    });
  }

  // ── Cards comparison ─────────────────────────────────
  const localCards = local.events.filter((e) => e.type === 'amarilla' || e.type === 'roja');
  const visitanteCards = visitante.events.filter((e) => e.type === 'amarilla' || e.type === 'roja');

  if (localCards.length !== visitanteCards.length) {
    discs.push({
      id: nextId(),
      field: 'tarjetas',
      description: 'Diferente cantidad de tarjetas registradas',
      localValue: `${localCards.length} tarjetas`,
      visitanteValue: `${visitanteCards.length} tarjetas`,
    });
  }

  // Match cards by player and type
  const unmatchedLocalCards = [...localCards];
  const unmatchedVisitanteCards = [...visitanteCards];

  for (let i = unmatchedLocalCards.length - 1; i >= 0; i--) {
    const lc = unmatchedLocalCards[i];
    const matchIdx = unmatchedVisitanteCards.findIndex(
      (vc) => vc.jugadorCarne === lc.jugadorCarne && vc.type === lc.type,
    );
    if (matchIdx >= 0) {
      const vc = unmatchedVisitanteCards[matchIdx];
      if (Math.abs(vc.minuto - lc.minuto) > 3) {
        discs.push({
          id: nextId(),
          field: 'tarjetas',
          description: `${lc.type === 'roja' ? 'Roja' : 'Amarilla'} de ${lc.jugadorNombre}: minuto distinto`,
          localValue: `min ${lc.minuto}`,
          visitanteValue: `min ${vc.minuto}`,
        });
      }
      unmatchedLocalCards.splice(i, 1);
      unmatchedVisitanteCards.splice(matchIdx, 1);
    }
  }

  for (const lc of unmatchedLocalCards) {
    discs.push({
      id: nextId(),
      field: 'tarjetas',
      description: `Tarjeta registrada solo por local: ${lc.type} a ${lc.jugadorNombre}`,
      localValue: `${lc.type} min ${lc.minuto}`,
      visitanteValue: '—',
    });
  }

  for (const vc of unmatchedVisitanteCards) {
    discs.push({
      id: nextId(),
      field: 'tarjetas',
      description: `Tarjeta registrada solo por visitante: ${vc.type} a ${vc.jugadorNombre}`,
      localValue: '—',
      visitanteValue: `${vc.type} min ${vc.minuto}`,
    });
  }

  // ── Substitution comparison ──────────────────────────
  const localSubs = local.events.filter((e) => e.type === 'cambio');
  const visitanteSubs = visitante.events.filter((e) => e.type === 'cambio');

  if (localSubs.length !== visitanteSubs.length) {
    discs.push({
      id: nextId(),
      field: 'cambios',
      description: 'Diferente cantidad de cambios registrados',
      localValue: `${localSubs.length} cambios`,
      visitanteValue: `${visitanteSubs.length} cambios`,
    });
  }

  return discs;
}
