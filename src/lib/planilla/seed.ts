import { saveMatch, saveSubmission, saveValidation } from './storage';
import type { PlanillaMatch, MatchSubmission, MatchValidation } from './types';

export async function seedDemoData(): Promise<{ message: string }> {
  // Demo match: two real Div A teams
  const matchId = '2026-03-15-ofc-vs-sayago';

  const match: PlanillaMatch = {
    id: matchId,
    fecha: '2026-03-15',
    hora: '15:00',
    cancha: 'Cancha OFC',
    divisional: 'A',
    torneo: 'Mayores Masculino',
    equipoLocalId: 'ofc',
    equipoLocalNombre: 'OFC',
    equipoVisitanteId: 'sayago',
    equipoVisitanteNombre: 'Sayago',
    status: 'submitted_both',
    createdAt: new Date().toISOString(),
  };

  await saveMatch(match);

  // Local submission (OFC)
  const localSubmission: MatchSubmission = {
    id: `${matchId}-ofc`,
    matchId,
    teamId: 'ofc',
    teamName: 'OFC',
    status: 'submitted',
    rival: 'Sayago',
    esLocal: true,
    golesClub: 2,
    golesRival: 1,
    dtNombre: 'Carlos Rodríguez',
    dtCI: '1.234.567-8',
    dtFirma: true,
    capitanCarne: '1001',
    roster: [
      { carne: '1001', camiseta: 10, nombre: 'Juan Pérez', esTitular: true, firma: true },
      { carne: '1002', camiseta: 1, nombre: 'Martín López', esTitular: true, firma: true },
      { carne: '1003', camiseta: 2, nombre: 'Diego Fernández', esTitular: true, firma: true },
      { carne: '1004', camiseta: 3, nombre: 'Sebastián García', esTitular: true, firma: true },
      { carne: '1005', camiseta: 4, nombre: 'Andrés Martínez', esTitular: true, firma: true },
      { carne: '1006', camiseta: 5, nombre: 'Nicolás Rodríguez', esTitular: true, firma: true },
      { carne: '1007', camiseta: 6, nombre: 'Federico González', esTitular: true, firma: true },
      { carne: '1008', camiseta: 7, nombre: 'Matías Hernández', esTitular: true, firma: true },
      { carne: '1009', camiseta: 8, nombre: 'Lucas Sánchez', esTitular: true, firma: true },
      { carne: '1010', camiseta: 9, nombre: 'Santiago Díaz', esTitular: true, firma: true },
      { carne: '1011', camiseta: 11, nombre: 'Rodrigo Silva', esTitular: true, firma: true },
      { carne: '1012', camiseta: 12, nombre: 'Pablo Ramírez', esTitular: false, firma: true },
      { carne: '1013', camiseta: 14, nombre: 'Alejandro Torres', esTitular: false, firma: true },
      { carne: '1014', camiseta: 15, nombre: 'Gabriel Acosta', esTitular: false, firma: true },
    ],
    events: [
      {
        id: 'evt-1',
        type: 'gol',
        minuto: 23,
        jugadorCarne: '1001',
        jugadorNombre: 'Juan Pérez',
      },
      {
        id: 'evt-2',
        type: 'gol',
        minuto: 67,
        jugadorCarne: '1010',
        jugadorNombre: 'Santiago Díaz',
      },
      {
        id: 'evt-3',
        type: 'amarilla',
        minuto: 55,
        jugadorCarne: '1006',
        jugadorNombre: 'Nicolás Rodríguez',
      },
      {
        id: 'evt-4',
        type: 'cambio',
        minuto: 70,
        jugadorCarne: '1011',
        jugadorNombre: 'Rodrigo Silva',
        jugadorSaleCarne: '1011',
        jugadorSaleNombre: 'Rodrigo Silva',
        jugadorEntraCarne: '1012',
        jugadorEntraNombre: 'Pablo Ramírez',
        jugadorEntraCamiseta: 12,
      },
    ],
    observaciones: '',
    submittedBy: 'ofc',
    submittedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await saveSubmission(localSubmission);

  // Visitante submission (Sayago) — with some discrepancies
  const visitanteSubmission: MatchSubmission = {
    id: `${matchId}-sayago`,
    matchId,
    teamId: 'sayago',
    teamName: 'Sayago',
    status: 'submitted',
    rival: 'OFC',
    esLocal: false,
    golesClub: 1,
    golesRival: 2,
    dtNombre: 'Miguel Ángel Brindisi',
    dtCI: '2.345.678-9',
    dtFirma: true,
    capitanCarne: '2001',
    roster: [
      { carne: '2001', camiseta: 5, nombre: 'Fernando Álvarez', esTitular: true, firma: true },
      { carne: '2002', camiseta: 1, nombre: 'Maximiliano Suárez', esTitular: true, firma: true },
      { carne: '2003', camiseta: 2, nombre: 'Bruno Méndez', esTitular: true, firma: true },
      { carne: '2004', camiseta: 3, nombre: 'Emiliano Correa', esTitular: true, firma: true },
      { carne: '2005', camiseta: 4, nombre: 'Facundo Pellistri', esTitular: true, firma: true },
      { carne: '2006', camiseta: 6, nombre: 'Gonzalo Pereira', esTitular: true, firma: true },
      { carne: '2007', camiseta: 7, nombre: 'Ignacio Castro', esTitular: true, firma: true },
      { carne: '2008', camiseta: 8, nombre: 'Jonathan Rodríguez', esTitular: true, firma: true },
      { carne: '2009', camiseta: 9, nombre: 'Kevin Dawson', esTitular: true, firma: true },
      { carne: '2010', camiseta: 10, nombre: 'Leandro Cabrera', esTitular: true, firma: true },
      { carne: '2011', camiseta: 11, nombre: 'Mathías Olivera', esTitular: true, firma: true },
      { carne: '2012', camiseta: 13, nombre: 'Nicolás De La Cruz', esTitular: false, firma: true },
      { carne: '2013', camiseta: 16, nombre: 'Óscar Tabárez', esTitular: false, firma: true },
    ],
    events: [
      {
        id: 'evt-v1',
        type: 'gol',
        minuto: 41,
        jugadorCarne: '2009',
        jugadorNombre: 'Kevin Dawson',
      },
      // Discrepancy: Sayago doesn't register OFC's first goal at minute 23 but at 25
      {
        id: 'evt-v2',
        type: 'amarilla',
        minuto: 55,
        jugadorCarne: '1006',
        jugadorNombre: 'Nicolás Rodríguez',
      },
      // Extra card not in local's submission
      {
        id: 'evt-v3',
        type: 'amarilla',
        minuto: 78,
        jugadorCarne: '2007',
        jugadorNombre: 'Ignacio Castro',
      },
    ],
    observaciones: 'El segundo gol de OFC fue en posición adelantada según nuestro criterio.',
    submittedBy: 'sayago',
    submittedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await saveSubmission(visitanteSubmission);

  // Create validation with auto-detected discrepancies
  const validation: MatchValidation = {
    matchId,
    status: 'pending',
    discrepancies: [
      {
        id: 'disc-1',
        field: 'goles',
        description: 'Diferente cantidad de goles registrados',
        localValue: '2 goles (OFC) + 0 goles rival',
        visitanteValue: '0 goles + 1 gol (Sayago)',
      },
      {
        id: 'disc-2',
        field: 'tarjetas',
        description: 'Tarjeta registrada solo por visitante: amarilla a Ignacio Castro min 78',
        localValue: '—',
        visitanteValue: 'amarilla min 78',
      },
    ],
    officialGolesLocal: 2,
    officialGolesVisitante: 1,
    officialRosterLocal: localSubmission.roster,
    officialRosterVisitante: visitanteSubmission.roster,
    officialEvents: [...localSubmission.events, ...visitanteSubmission.events.filter((e) => e.type === 'gol')],
    validatedBy: null,
    validatedAt: null,
    publishedAt: null,
  };

  await saveValidation(validation);

  return { message: `Seed data creado: partido ${matchId} con 2 submissions y discrepancias` };
}
