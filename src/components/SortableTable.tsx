'use client';

import { useState, useMemo } from 'react';

export interface Column<T> {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (row: T) => React.ReactNode;
  align?: 'left' | 'center' | 'right';
  className?: string;
}

interface Props<T> {
  data: T[];
  columns: Column<T>[];
  keyField: string;
  defaultSort?: string;
  defaultDir?: 'asc' | 'desc';
  emptyMessage?: string;
}

export function SortableTable<T extends Record<string, unknown>>({
  data,
  columns,
  keyField,
  defaultSort,
  defaultDir = 'desc',
  emptyMessage = 'Sin datos',
}: Props<T>) {
  const [sortKey, setSortKey] = useState(defaultSort || '');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>(defaultDir);

  const sorted = useMemo(() => {
    if (!sortKey) return data;
    return [...data].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (typeof av === 'number' && typeof bv === 'number') {
        return sortDir === 'asc' ? av - bv : bv - av;
      }
      const as = String(av ?? '');
      const bs = String(bv ?? '');
      return sortDir === 'asc' ? as.localeCompare(bs) : bs.localeCompare(as);
    });
  }, [data, sortKey, sortDir]);

  function handleSort(key: string) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  }

  if (data.length === 0) {
    return <div className="text-center text-gray-500 py-8">{emptyMessage}</div>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-[#1e293b]">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-[#1e293b]">
            {columns.map((col) => (
              <th
                key={col.key}
                className={`px-4 py-3 font-semibold text-gray-300 ${
                  col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                } ${col.sortable !== false ? 'cursor-pointer hover:text-white select-none' : ''} ${col.className || ''}`}
                onClick={() => col.sortable !== false && handleSort(col.key)}
              >
                {col.label}
                {sortKey === col.key && (
                  <span className="ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row, i) => (
            <tr
              key={String(row[keyField] ?? i)}
              className="border-t border-[#1e293b] hover:bg-[#1a2332] transition-colors"
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={`px-4 py-3 ${
                    col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                  } ${col.className || ''}`}
                >
                  {col.render ? col.render(row) : String(row[col.key] ?? '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
