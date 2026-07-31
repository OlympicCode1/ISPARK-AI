'use client';

import { OccupancyRing } from './OccupancyRing';
import { BAND_COLORS, BAND_LABELS, type Park } from '@/lib/ispark';
import { bearingDeg, compassTr, formatDistance, haversineKm, type LatLng } from '@/lib/geo';

export function ParkCard({
  park,
  selected,
  onSelect,
  userCoords,
}: {
  park: Park;
  selected: boolean;
  onSelect: (id: number) => void;
  userCoords: LatLng | null;
}) {
  const color = BAND_COLORS[park.band];
  const dir = userCoords
    ? `${formatDistance(haversineKm(userCoords, park))} · ${compassTr(bearingDeg(userCoords, park))}`
    : null;
  const dirUrl = `https://www.google.com/maps/dir/?api=1&destination=${park.lat},${park.lng}`;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(park.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(park.id);
        }
      }}
      className={`flex w-full cursor-pointer gap-3 rounded-xl border p-3 text-left transition ${
        selected
          ? 'border-blue-500 bg-blue-500/10'
          : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.06]'
      }`}
    >
      <OccupancyRing occupancy={park.occupancy} band={park.band} covered={park.isCovered} />

      <div className="min-w-0 flex-1">
        <h3 className="truncate text-sm font-semibold text-white">{park.name}</h3>
        <div className="mt-0.5 text-xs text-white/50">
          {park.district} · {park.isCovered ? 'Kapalı' : 'Açık'} otopark
        </div>

        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full transition-[width]"
            style={{ width: `${park.band === 'unknown' ? 0 : (park.occupancy ?? 0)}%`, background: color }}
          />
        </div>

        <div className="mt-1.5 flex items-center justify-between text-xs">
          <span className="font-medium" style={{ color }}>
            {BAND_LABELS[park.band]}
            {park.band !== 'unknown' && park.occupancy !== null ? ` · %${park.occupancy}` : ''}
          </span>
          <span className="text-white/60">
            {park.isOpen ? `${park.available}/${park.capacity} boş` : 'Kapalı'}
          </span>
        </div>

        <div className="mt-2 flex items-center gap-2">
          {dir && <span className="text-[11px] text-white/40">{dir}</span>}
          <a
            href={dirUrl}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="ml-auto text-[11px] font-medium text-blue-400 hover:text-blue-300"
          >
            Yol tarifi →
          </a>
        </div>
      </div>
    </div>
  );
}
