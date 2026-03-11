import type { MatchSubmission, ValidationIssue } from './types';

export function validateSubmission(submission: MatchSubmission): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const { roster, events, capitanCarne } = submission;

  // ── Roster validations ───────────────────────────────
  const titulares = roster.filter((p) => p.esTitular);
  const suplentes = roster.filter((p) => !p.esTitular);

  if (titulares.length !== 11) {
    issues.push({
      field: 'roster',
      message: `Se esperan 11 titulares, hay ${titulares.length}`,
      severity: titulares.length === 0 ? 'error' : 'warning',
    });
  }

  if (suplentes.length === 0) {
    issues.push({
      field: 'roster',
      message: 'No hay suplentes registrados',
      severity: 'warning',
    });
  }

  // Duplicate players by carné
  const carnes = roster.map((p) => p.carne).filter(Boolean);
  const dupes = carnes.filter((c, i) => carnes.indexOf(c) !== i);
  if (dupes.length > 0) {
    issues.push({
      field: 'roster',
      message: `Jugadores duplicados (carné): ${Array.from(new Set(dupes)).join(', ')}`,
      severity: 'error',
    });
  }

  // Duplicate camiseta
  const camisetas = roster.map((p) => p.camiseta).filter((c) => c > 0);
  const dupesCamiseta = camisetas.filter((c, i) => camisetas.indexOf(c) !== i);
  if (dupesCamiseta.length > 0) {
    issues.push({
      field: 'roster',
      message: `Camisetas duplicadas: ${Array.from(new Set(dupesCamiseta)).join(', ')}`,
      severity: 'warning',
    });
  }

  // Captain must be in titulares
  if (capitanCarne) {
    const capInTitulares = titulares.some((p) => p.carne === capitanCarne);
    if (!capInTitulares) {
      issues.push({
        field: 'capitanCarne',
        message: 'El capitán debe ser un titular',
        severity: 'warning',
      });
    }
  } else {
    issues.push({
      field: 'capitanCarne',
      message: 'No se seleccionó capitán',
      severity: 'warning',
    });
  }

  // ── Event validations ────────────────────────────────
  const rosterCarnes = new Set(roster.map((p) => p.carne));

  for (const event of events) {
    // Minute range
    if (event.minuto < 0 || event.minuto > 130) {
      issues.push({
        field: 'events',
        message: `Minuto inválido (${event.minuto}) para evento de ${event.jugadorNombre}`,
        severity: 'warning',
      });
    }

    // Player in roster
    if (event.jugadorCarne && !rosterCarnes.has(event.jugadorCarne)) {
      issues.push({
        field: 'events',
        message: `${event.jugadorNombre} (${event.jugadorCarne}) no está en la nómina`,
        severity: 'warning',
      });
    }

    // Substitution logic
    if (event.type === 'cambio') {
      if (event.jugadorEntraCarne && !rosterCarnes.has(event.jugadorEntraCarne)) {
        issues.push({
          field: 'events',
          message: `Jugador que entra (${event.jugadorEntraNombre}) no está en la nómina`,
          severity: 'warning',
        });
      }
      // Player leaving should be a titular or have entered via previous sub
      if (event.jugadorSaleCarne) {
        const isOnField =
          titulares.some((p) => p.carne === event.jugadorSaleCarne) ||
          events.some(
            (e) =>
              e.type === 'cambio' &&
              e.jugadorEntraCarne === event.jugadorSaleCarne &&
              e.minuto < event.minuto,
          );
        if (!isOnField) {
          issues.push({
            field: 'events',
            message: `${event.jugadorSaleNombre || event.jugadorSaleCarne} no estaba en cancha al minuto ${event.minuto}`,
            severity: 'warning',
          });
        }
      }
    }
  }

  return issues;
}
