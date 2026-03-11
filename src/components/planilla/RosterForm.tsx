'use client';

import { useState, useRef, useEffect } from 'react';
import type { RosterPlayer, PlayerOption } from '@/lib/planilla/types';

interface Props {
  title: string;
  esTitular: boolean;
  players: RosterPlayer[];
  availablePlayers: PlayerOption[];
  onChange: (players: RosterPlayer[]) => void;
  capitanCarne?: string;
  onCapitanChange?: (carne: string) => void;
  matchId?: string;
  teamId?: string;
}

export function RosterForm({
  title,
  esTitular,
  players,
  availablePlayers,
  onChange,
  capitanCarne,
  onCapitanChange,
  matchId,
  teamId,
}: Props) {
  const addPlayer = () => {
    onChange([
      ...players,
      { carne: '', camiseta: 0, nombre: '', esTitular, firma: false },
    ]);
  };

  const removePlayer = (idx: number) => {
    const updated = players.filter((_, i) => i !== idx);
    onChange(updated);
  };

  const updatePlayer = (idx: number, field: keyof RosterPlayer, value: string | number | boolean) => {
    const updated = [...players];
    updated[idx] = { ...updated[idx], [field]: value };
    onChange(updated);
  };

  const selectFromRoster = (idx: number, player: PlayerOption) => {
    const updated = [...players];
    updated[idx] = {
      ...updated[idx],
      carne: player.carne,
      nombre: player.nombre,
    };
    onChange(updated);
  };

  const setPhoto = (idx: number, filename: string) => {
    const updated = [...players];
    updated[idx] = { ...updated[idx], fotoFilename: filename, firma: true };
    onChange(updated);
  };

  return (
    <div className="bg-liga-card border border-liga-border rounded-xl p-4 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        <span className="text-sm text-gray-400">{players.length} jugadores</span>
      </div>

      <div className="space-y-3">
        {players.map((player, idx) => (
          <PlayerRow
            key={idx}
            player={player}
            index={idx}
            availablePlayers={availablePlayers}
            usedCarnes={players.map((p) => p.carne).filter((c) => c !== player.carne)}
            isCapitan={capitanCarne === player.carne && !!player.carne}
            showCapitan={esTitular}
            matchId={matchId}
            teamId={teamId}
            onUpdate={(field, value) => updatePlayer(idx, field, value)}
            onSelect={(p) => selectFromRoster(idx, p)}
            onRemove={() => removePlayer(idx)}
            onCapitanToggle={() => onCapitanChange?.(player.carne)}
            onPhotoUploaded={(filename) => setPhoto(idx, filename)}
          />
        ))}
      </div>

      <button
        type="button"
        onClick={addPlayer}
        className="mt-4 w-full py-2.5 border border-dashed border-[#2d3a4f] rounded-lg text-gray-400 hover:text-white hover:border-liga-blue transition-colors text-sm"
      >
        + Agregar jugador
      </button>
    </div>
  );
}

// ── Compress image client-side ─────────────────────────

function compressImage(file: File, maxWidth: number, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      let w = img.width;
      let h = img.height;
      if (w > maxWidth) {
        h = (h * maxWidth) / w;
        w = maxWidth;
      }
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('No canvas context')); return; }
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Compression failed'));
        },
        'image/jpeg',
        quality,
      );
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = url;
  });
}

// ── Player Row ─────────────────────────────────────────

interface PlayerRowProps {
  player: RosterPlayer;
  index: number;
  availablePlayers: PlayerOption[];
  usedCarnes: string[];
  isCapitan: boolean;
  showCapitan: boolean;
  matchId?: string;
  teamId?: string;
  onUpdate: (field: keyof RosterPlayer, value: string | number | boolean) => void;
  onSelect: (p: PlayerOption) => void;
  onRemove: () => void;
  onCapitanToggle: () => void;
  onPhotoUploaded: (filename: string) => void;
}

function PlayerRow({
  player,
  availablePlayers,
  usedCarnes,
  isCapitan,
  showCapitan,
  matchId,
  teamId,
  onUpdate,
  onSelect,
  onRemove,
  onCapitanToggle,
  onPhotoUploaded,
}: PlayerRowProps) {
  const [search, setSearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [uploading, setUploading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const filtered = availablePlayers
    .filter((p) => !usedCarnes.includes(p.carne))
    .filter(
      (p) =>
        !search ||
        p.nombre.toLowerCase().includes(search.toLowerCase()) ||
        p.carne.includes(search),
    )
    .slice(0, 15);

  async function handlePhotoCapture(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !matchId || !teamId || !player.carne) return;

    setUploading(true);
    try {
      // Compress to max 480px wide, 70% quality
      const compressed = await compressImage(file, 480, 0.7);

      const formData = new FormData();
      formData.append('photo', compressed, `${player.carne}.jpg`);
      formData.append('matchId', matchId);
      formData.append('teamId', teamId);
      formData.append('carne', player.carne);

      const res = await fetch('/api/planilla/photos', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (res.ok && data.filename) {
        onPhotoUploaded(data.filename);
      }
    } catch {
      // silent fail
    }
    setUploading(false);
    // Reset input so same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  const inputClass =
    'bg-[#0a0f1a] border border-[#2d3a4f] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-liga-blue transition-colors';

  const hasPhoto = !!player.fotoFilename;

  return (
    <div className="flex flex-col gap-2 p-3 bg-[#0a0f1a]/50 rounded-lg">
      <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
        {/* Photo thumbnail */}
        {hasPhoto && (
          <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-green-500/40 shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/planilla/photos?filename=${encodeURIComponent(player.fotoFilename!)}`}
              alt={player.nombre}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Player search / name */}
        <div className="relative flex-1 w-full" ref={dropdownRef}>
          <input
            type="text"
            value={player.nombre || search}
            onChange={(e) => {
              setSearch(e.target.value);
              if (player.nombre) {
                onUpdate('nombre', '');
                onUpdate('carne', '');
              }
              setShowDropdown(true);
            }}
            onFocus={() => {
              if (!player.nombre) setShowDropdown(true);
            }}
            placeholder="Buscar jugador..."
            className={`${inputClass} w-full`}
          />
          {showDropdown && filtered.length > 0 && !player.nombre && (
            <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-[#131d2e] border border-liga-border rounded-lg shadow-xl max-h-48 overflow-y-auto">
              {filtered.map((p) => (
                <button
                  key={p.carne}
                  type="button"
                  onClick={() => {
                    onSelect(p);
                    setSearch('');
                    setShowDropdown(false);
                  }}
                  className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-colors"
                >
                  <span className="font-medium">{p.nombre}</span>
                  <span className="text-gray-500 ml-2">#{p.carne}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Carné */}
        <input
          type="text"
          value={player.carne}
          onChange={(e) => onUpdate('carne', e.target.value)}
          placeholder="Carné"
          className={`${inputClass} w-20 sm:w-24`}
        />

        {/* Camiseta */}
        <input
          type="number"
          value={player.camiseta || ''}
          onChange={(e) => onUpdate('camiseta', parseInt(e.target.value) || 0)}
          placeholder="#"
          min={1}
          max={99}
          className={`${inputClass} w-16`}
        />

        {/* Photo capture button */}
        {player.carne && matchId && teamId && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="user"
              onChange={handlePhotoCapture}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              title={hasPhoto ? 'Cambiar foto' : 'Tomar foto (firma)'}
              className={`shrink-0 p-2 rounded-lg text-xs transition-colors ${
                hasPhoto
                  ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                  : 'bg-[#0a0f1a] text-gray-400 hover:text-white border border-[#2d3a4f] hover:border-liga-blue'
              }`}
            >
              {uploading ? (
                <span className="animate-pulse">...</span>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              )}
            </button>
          </>
        )}

        {/* Capitan */}
        {showCapitan && player.carne && (
          <button
            type="button"
            onClick={onCapitanToggle}
            title={isCapitan ? 'Capitán' : 'Marcar como capitán'}
            className={`text-xs px-2 py-1 rounded-md shrink-0 transition-colors ${
              isCapitan
                ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                : 'text-gray-500 hover:text-yellow-400'
            }`}
          >
            C
          </button>
        )}

        {/* Remove */}
        <button
          type="button"
          onClick={onRemove}
          className="text-gray-500 hover:text-red-400 transition-colors shrink-0"
          title="Quitar jugador"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Firma status line */}
      {hasPhoto && (
        <div className="flex items-center gap-1.5 ml-12 text-xs text-green-400">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Firmado con foto
        </div>
      )}
    </div>
  );
}
