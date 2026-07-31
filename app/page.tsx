'use client';

import dynamic from 'next/dynamic';
import { useMemo, useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import type { SortKey } from '@/components/Filters';
import { useParks } from '@/lib/useParks';
import { haversineKm, type LatLng } from '@/lib/geo';

const MapView = dynamic(() => import('@/components/MapView'), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 grid place-items-center text-sm text-white/40">
      Harita yükleniyor…
    </div>
  ),
});

const norm = (s: string) => s.toLocaleLowerCase('tr-TR');

export default function Page() {
  const { parks, isLoading, error, lastUpdated } = useParks();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [query, setQuery] = useState('');
  const [hideClosed, setHideClosed] = useState(false);
  const [sort, setSort] = useState<SortKey>('availability');
  const [userCoords, setUserCoords] = useState<LatLng | null>(null);

  const filtered = useMemo(() => {
    const q = norm(query.trim());
    const list = parks.filter((p) => {
      if (hideClosed && (!p.isOpen || p.occupancy === null)) return false;
      if (!q) return true;
      return norm(p.name).includes(q) || norm(p.district).includes(q);
    });

    return [...list].sort((a, b) => {
      if (sort === 'name') return a.name.localeCompare(b.name, 'tr');
      if (sort === 'distance' && userCoords) {
        return haversineKm(userCoords, a) - haversineKm(userCoords, b);
      }
      // "En boş": most free spaces first; closed/unknown lots sink to the bottom.
      const av = a.isOpen && a.occupancy !== null ? a.available : -1;
      const bv = b.isOpen && b.occupancy !== null ? b.available : -1;
      return bv - av;
    });
  }, [parks, query, hideClosed, sort, userCoords]);

  const selected = useMemo(
    () => parks.find((p) => p.id === selectedId) ?? null,
    [parks, selectedId],
  );

  return (
    <main className="flex h-[100dvh] flex-col bg-slate-900 md:flex-row">
      <div className="order-2 h-[45vh] w-full shrink-0 md:order-1 md:h-full md:w-[400px]">
        <Sidebar
          parks={filtered}
          total={filtered.length}
          selected={selected}
          onSelect={setSelectedId}
          onClose={() => setSelectedId(null)}
          query={query}
          onQuery={setQuery}
          hideClosed={hideClosed}
          onHideClosed={setHideClosed}
          sort={sort}
          onSort={setSort}
          userCoords={userCoords}
          lastUpdated={lastUpdated}
          isLoading={isLoading}
          error={error}
        />
      </div>

      <div className="relative order-1 flex-1 md:order-2">
        <MapView
          parks={filtered}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onUserLocation={setUserCoords}
        />
      </div>
    </main>
  );
}
