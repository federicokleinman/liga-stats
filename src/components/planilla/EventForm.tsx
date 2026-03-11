'use client';

import { useState } from 'react';
import type { MatchEvent, EventType, RosterPlayer } from '@/lib/planilla/types';

interface Props {
  events: MatchEvent[];
  roster: RosterPlayer[];
  onChange: (events: MatchEvent[]) => void;
}

const EVENT_TABS: { type: EventType; label: string }[] = [
  { type: 'gol', label: 'Gol' },
  { type: 'amarilla', label: 'Amarilla' },
  { type: 'roja', label: 'Roja' },
  { type: 'cambio', label: 'Cambio' },
];

export function EventForm({ events, roster, onChange }: Props) {
  const [activeTab, setActiveTab] = useState<EventType>('gol');
  const [minuto, setMinuto] = useState<number>(0);
  const [jugadorCarne, setJugadorCarne] = useState('');
  const [enContra, setEnContra] = useState(false);
  // cambio fields
  const [saleCarne, setSaleCarne] = useState('');
  const [entraCarne, setEntraCarne] = useState('');
  const [entraCamiseta, setEntraCamiseta] = useState<number>(0);

  const findPlayer = (carne: string) => roster.find((p) => p.carne === carne);

  const titulares = roster.filter((p) => p.esTitular);
  const suplentes = roster.filter((p) => !p.esTitular);

  // Players currently on the field (titulares + entered via subs - exited via subs)
  const onField = new Set(titulares.map((p) => p.carne));
  const onBench = new Set(suplentes.map((p) => p.carne));
  for (const e of events) {
    if (e.type === 'cambio') {
      if (e.jugadorSaleCarne) onField.delete(e.jugadorSaleCarne);
      if (e.jugadorEntraCarne) {
        onField.add(e.jugadorEntraCarne);
        onBench.delete(e.jugadorEntraCarne);
      }
    }
  }

  const addEvent = () => {
    const player = findPlayer(jugadorCarne);
    const newEvent: MatchEvent = {
      id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type: activeTab,
      minuto,
      jugadorCarne: activeTab === 'cambio' ? saleCarne : jugadorCarne,
      jugadorNombre: activeTab === 'cambio'
        ? (findPlayer(saleCarne)?.nombre || saleCarne)
        : (player?.nombre || jugadorCarne),
      enContra: activeTab === 'gol' ? enContra : undefined,
      jugadorSaleCarne: activeTab === 'cambio' ? saleCarne : undefined,
      jugadorSaleNombre: activeTab === 'cambio' ? (findPlayer(saleCarne)?.nombre || saleCarne) : undefined,
      jugadorEntraCarne: activeTab === 'cambio' ? entraCarne : undefined,
      jugadorEntraNombre: activeTab === 'cambio' ? (findPlayer(entraCarne)?.nombre || entraCarne) : undefined,
      jugadorEntraCamiseta: activeTab === 'cambio' ? entraCamiseta : undefined,
    };

    onChange([...events, newEvent].sort((a, b) => a.minuto - b.minuto));
    resetForm();
  };

  const removeEvent = (id: string) => {
    onChange(events.filter((e) => e.id !== id));
  };

  const resetForm = () => {
    setMinuto(0);
    setJugadorCarne('');
    setEnContra(false);
    setSaleCarne('');
    setEntraCarne('');
    setEntraCamiseta(0);
  };

  const selectClass =
    'bg-[#0a0f1a] border border-[#2d3a4f] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-liga-blue transition-colors';
  const inputClass = selectClass;

  const canAdd =
    activeTab === 'cambio'
      ? saleCarne && entraCarne && minuto >= 0
      : jugadorCarne && minuto >= 0;

  return (
    <div className="bg-liga-card border border-liga-border rounded-xl p-4 sm:p-6">
      <h3 className="text-lg font-semibold text-white mb-4">Eventos del partido</h3>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-[#0a0f1a] rounded-lg p-1">
        {EVENT_TABS.map((tab) => (
          <button
            key={tab.type}
            type="button"
            onClick={() => { setActiveTab(tab.type); resetForm(); }}
            className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.type
                ? 'bg-liga-blue text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Event input form */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div>
          <label className="block text-xs text-gray-400 mb-1">Minuto</label>
          <input
            type="number"
            value={minuto || ''}
            onChange={(e) => setMinuto(parseInt(e.target.value) || 0)}
            min={0}
            max={130}
            className={`${inputClass} w-20`}
            placeholder="Min"
          />
        </div>

        {activeTab !== 'cambio' ? (
          <div className="flex-1">
            <label className="block text-xs text-gray-400 mb-1">Jugador</label>
            <select
              value={jugadorCarne}
              onChange={(e) => setJugadorCarne(e.target.value)}
              className={`${selectClass} w-full`}
            >
              <option value="">Seleccionar jugador</option>
              {roster.map((p) => (
                <option key={p.carne} value={p.carne}>
                  {p.nombre} (#{p.carne})
                </option>
              ))}
            </select>
          </div>
        ) : (
          <>
            <div className="flex-1">
              <label className="block text-xs text-gray-400 mb-1">Sale</label>
              <select
                value={saleCarne}
                onChange={(e) => setSaleCarne(e.target.value)}
                className={`${selectClass} w-full`}
              >
                <option value="">Jugador que sale</option>
                {roster
                  .filter((p) => onField.has(p.carne))
                  .map((p) => (
                    <option key={p.carne} value={p.carne}>
                      {p.nombre} (#{p.carne})
                    </option>
                  ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-xs text-gray-400 mb-1">Entra</label>
              <select
                value={entraCarne}
                onChange={(e) => setEntraCarne(e.target.value)}
                className={`${selectClass} w-full`}
              >
                <option value="">Jugador que entra</option>
                {roster
                  .filter((p) => onBench.has(p.carne))
                  .map((p) => (
                    <option key={p.carne} value={p.carne}>
                      {p.nombre} (#{p.carne})
                    </option>
                  ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Camiseta</label>
              <input
                type="number"
                value={entraCamiseta || ''}
                onChange={(e) => setEntraCamiseta(parseInt(e.target.value) || 0)}
                className={`${inputClass} w-16`}
                placeholder="#"
              />
            </div>
          </>
        )}

        {activeTab === 'gol' && (
          <div className="flex items-end">
            <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer pb-2">
              <input
                type="checkbox"
                checked={enContra}
                onChange={(e) => setEnContra(e.target.checked)}
                className="rounded border-[#2d3a4f] bg-[#0a0f1a] text-liga-blue focus:ring-liga-blue"
              />
              En contra
            </label>
          </div>
        )}

        <div className="flex items-end">
          <button
            type="button"
            onClick={addEvent}
            disabled={!canAdd}
            className="px-4 py-2 bg-liga-blue text-white rounded-lg text-sm font-medium hover:bg-liga-blue/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Agregar
          </button>
        </div>
      </div>

      {/* Events list */}
      {events.length > 0 && (
        <div className="space-y-2">
          {events.map((event) => (
            <EventRow key={event.id} event={event} onRemove={() => removeEvent(event.id)} />
          ))}
        </div>
      )}

      {events.length === 0 && (
        <p className="text-gray-500 text-sm text-center py-4">
          No hay eventos registrados
        </p>
      )}
    </div>
  );
}

function EventRow({ event, onRemove }: { event: MatchEvent; onRemove: () => void }) {
  const typeLabels: Record<EventType, string> = {
    gol: 'Gol',
    amarilla: 'Amarilla',
    roja: 'Roja',
    cambio: 'Cambio',
  };

  const typeColors: Record<EventType, string> = {
    gol: 'text-green-400',
    amarilla: 'text-yellow-400',
    roja: 'text-red-400',
    cambio: 'text-blue-400',
  };

  let description = event.jugadorNombre;
  if (event.type === 'gol' && event.enContra) description += ' (en contra)';
  if (event.type === 'cambio') {
    description = `Sale ${event.jugadorSaleNombre || event.jugadorSaleCarne} → Entra ${event.jugadorEntraNombre || event.jugadorEntraCarne}`;
  }

  return (
    <div className="flex items-center gap-3 p-2.5 bg-[#0a0f1a]/50 rounded-lg">
      <span className="text-gray-500 text-sm font-mono w-10 text-right shrink-0">
        {event.minuto}&apos;
      </span>
      <span className={`text-xs font-medium w-16 shrink-0 ${typeColors[event.type]}`}>
        {typeLabels[event.type]}
      </span>
      <span className="text-white text-sm flex-1 truncate">{description}</span>
      <button
        type="button"
        onClick={onRemove}
        className="text-gray-500 hover:text-red-400 transition-colors shrink-0"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
