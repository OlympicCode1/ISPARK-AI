'use client';

import { SearchBar } from './SearchBar';
import { Legend } from './Legend';
import { Filters, type SortKey } from './Filters';
import { ParkList } from './ParkList';
import { ParkDetailPanel } from './ParkDetailPanel';
import type { Park } from '@/lib/ispark';
import type { LatLng } from '@/lib/geo';

export function Sidebar({
  parks,
  total,
  selected,
  onSelect,
  onClose,
  query,
  onQuery,
  hideClosed,
  onHideClosed,
  sort,
  onSort,
  userCoords,
  lastUpdated,
  isLoading,
  error,
}: {
  parks: Park[];
  total: number;
  selected: Park | null;
  onSelect: (id: number) => void;
  onClose: () => void;
  query: string;
  onQuery: (v: string) => void;
  hideClosed: boolean;
  onHideClosed: (v: boolean) => void;
  sort: SortKey;
  onSort: (v: SortKey) => void;
  userCoords: LatLng | null;
  lastUpdated: Date | null;
  isLoading: boolean;
  error: unknown;
}) {
  return (
    <aside className="relative flex h-full flex-col border-r border-white/10 bg-slate-950">
      <header className="border-b border-white/10 p-4">
        <h1 className="text-base font-bold text-white">İstanbul Otopark Haritası</h1>
        <p className="mt-0.5 text-xs text-white/45">
          {isLoading && !total ? 'Yükleniyor…' : `${total} otopark`}
          {lastUpdated
            ? ` · Son güncelleme ${lastUpdated.toLocaleTimeString('tr-TR', {
                hour: '2-digit',
                minute: '2-digit',
              })}`
            : ''}
          <span className="ml-1 inline-flex items-center gap-1 text-emerald-400/80">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
            canlı
          </span>
        </p>
      </header>

      <div className="space-y-3 border-b border-white/10 p-3">
        <SearchBar value={query} onChange={onQuery} />
        <Legend />
        <Filters
          hideClosed={hideClosed}
          onHideClosed={onHideClosed}
          sort={sort}
          onSort={onSort}
          canSortByDistance={!!userCoords}
        />
      </div>

      {error ? (
        <div className="border-b border-red-500/20 bg-red-500/10 p-3 text-xs text-red-300">
          İSPARK verisi alınamadı. Otomatik olarak tekrar denenecek…
        </div>
      ) : null}

      <ParkList
        parks={parks}
        selectedId={selected?.id ?? null}
        onSelect={onSelect}
        userCoords={userCoords}
      />

      {selected ? (
        <ParkDetailPanel park={selected} onClose={onClose} userCoords={userCoords} />
      ) : null}
    </aside>
  );
}
