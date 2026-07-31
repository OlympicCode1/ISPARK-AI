'use client';

import useSWR from 'swr';
import { OccupancyRing } from './OccupancyRing';
import { TrafficMap } from './TrafficMap';
import { BAND_COLORS, BAND_LABELS, type Park, type ParkDetail } from '@/lib/ispark';
import { bearingDeg, compassTr, formatDistance, haversineKm, type LatLng } from '@/lib/geo';

const fetcher = (u: string) =>
  fetch(u).then((r) => (r.ok ? r.json() : Promise.reject(new Error('detay'))));

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="shrink-0 text-white/40">{label}</dt>
      <dd className="text-right text-white">{value}</dd>
    </div>
  );
}

export function ParkDetailPanel({
  park,
  onClose,
  userCoords,
}: {
  park: Park;
  onClose: () => void;
  userCoords: LatLng | null;
}) {
  const { data } = useSWR<ParkDetail>(`/api/parks/${park.id}`, fetcher, {
    refreshInterval: 30_000,
  });
  const color = BAND_COLORS[park.band];
  const dirUrl = `https://www.google.com/maps/dir/?api=1&destination=${park.lat},${park.lng}`;
  const dir = userCoords
    ? `${formatDistance(haversineKm(userCoords, park))} uzakta · ${compassTr(bearingDeg(userCoords, park))}`
    : null;

  return (
    <div className="absolute inset-0 z-20 flex flex-col bg-slate-950">
      <div className="flex items-center gap-2 border-b border-white/10 p-3">
        <button
          onClick={onClose}
          className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm text-white/70 hover:bg-white/10 hover:text-white"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Geri
        </button>
        <span className="truncate text-sm font-semibold text-white">{park.name}</span>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        <div className="flex items-center gap-3">
          <OccupancyRing occupancy={park.occupancy} band={park.band} covered={park.isCovered} size={64} />
          <div className="min-w-0">
            <div className="text-lg font-bold" style={{ color }}>
              {BAND_LABELS[park.band]}
              {park.band !== 'unknown' && park.occupancy !== null ? ` · %${park.occupancy}` : ''}
            </div>
            <div className="text-sm text-white/60">
              {park.isOpen ? `${park.available} / ${park.capacity} boş yer` : 'Şu an kapalı'}
            </div>
            {dir && <div className="mt-0.5 text-xs text-white/40">{dir}</div>}
          </div>
        </div>

        <a
          href={dirUrl}
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-500"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M3 11l19-9-9 19-2-8-8-2z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Yol Tarifi Al
        </a>

        <dl className="space-y-2 text-sm">
          <Row label="İlçe" value={park.district} />
          <Row label="Adres" value={data?.address || '—'} />
          <Row label="Tür" value={park.isCovered ? 'Kapalı otopark' : 'Açık otopark'} />
          <Row label="Çalışma saatleri" value={park.workHours || '—'} />
          <Row label="Ücretsiz süre" value={park.freeTime ? `${park.freeTime} dk` : '—'} />
          {data?.monthlyFee ? (
            <Row label="Aylık abonelik" value={`${data.monthlyFee.toLocaleString('tr-TR')} ₺`} />
          ) : null}
          {data?.updateDate ? <Row label="İSPARK güncellemesi" value={data.updateDate} /> : null}
        </dl>

        {data?.tariff?.length ? (
          <div>
            <div className="mb-1 text-xs font-medium uppercase tracking-wide text-white/40">
              Tarife
            </div>
            <div className="divide-y divide-white/5 rounded-lg border border-white/10">
              {data.tariff.map((t, i) => (
                <div key={i} className="flex justify-between px-3 py-1.5 text-xs">
                  <span className="text-white/70">{t.label}</span>
                  <span className="font-medium text-white">{t.price} ₺</span>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <TrafficMap
          lat={park.lat}
          lng={park.lng}
          name={park.name}
          userCoords={userCoords}
        />
      </div>
    </div>
  );
}
