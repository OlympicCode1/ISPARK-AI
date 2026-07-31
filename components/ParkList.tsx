'use client';

import { ParkCard } from './ParkCard';
import type { Park } from '@/lib/ispark';
import type { LatLng } from '@/lib/geo';

export function ParkList({
  parks,
  selectedId,
  onSelect,
  userCoords,
}: {
  parks: Park[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  userCoords: LatLng | null;
}) {
  if (!parks.length) {
    return (
      <div className="grid flex-1 place-items-center p-6 text-center text-sm text-white/40">
        Sonuç bulunamadı
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-2 overflow-y-auto p-3">
      {parks.map((p) => (
        <ParkCard
          key={p.id}
          park={p}
          selected={p.id === selectedId}
          onSelect={onSelect}
          userCoords={userCoords}
        />
      ))}
    </div>
  );
}
