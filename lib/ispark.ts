// İSPARK data types, fetchers, and occupancy helpers.
// Data source: https://api.ibb.gov.tr/ispark  (İBB open data, CORS-open, no auth key).

export type OccupancyBand = 'available' | 'filling' | 'busy' | 'full' | 'unknown';

/** Raw record shape returned by /ispark/Park */
export interface RawPark {
  parkID: number;
  parkName: string;
  lat: string;
  lng: string;
  capacity: number;
  emptyCapacity: number;
  workHours: string;
  parkType: string;
  freeTime: number;
  district: string;
  isOpen: number;
}

/** Normalized lot used across the app. */
export interface Park {
  id: number;
  name: string;
  lat: number;
  lng: number;
  capacity: number;
  available: number;
  occupied: number;
  /** 0..100, or null when unknown (closed / no capacity). */
  occupancy: number | null;
  band: OccupancyBand;
  district: string;
  parkType: string;
  isCovered: boolean;
  workHours: string;
  freeTime: number;
  isOpen: boolean;
}

export interface TariffRow {
  label: string;
  price: string;
}

export interface ParkDetail extends Park {
  address: string;
  locationName: string;
  monthlyFee: number | null;
  tariff: TariffRow[];
  updateDate: string | null;
}

export const BAND_COLORS: Record<OccupancyBand, string> = {
  available: '#22c55e',
  filling: '#eab308',
  busy: '#f97316',
  full: '#ef4444',
  unknown: '#9ca3af',
};

export const BAND_LABELS: Record<OccupancyBand, string> = {
  available: 'Müsait',
  filling: 'Dolmakta',
  busy: 'Yoğun',
  full: 'Dolu',
  unknown: 'Veri yok',
};

export const BAND_RANGES: Record<Exclude<OccupancyBand, 'unknown'>, string> = {
  available: '%0–49',
  filling: '%50–74',
  busy: '%75–89',
  full: '%90–100',
};

export function bandOf(occupancy: number | null, isOpen: boolean): OccupancyBand {
  if (!isOpen || occupancy === null) return 'unknown';
  if (occupancy < 50) return 'available';
  if (occupancy < 75) return 'filling';
  if (occupancy < 90) return 'busy';
  return 'full';
}

export function normalizePark(r: RawPark): Park {
  const capacity = Number(r.capacity) || 0;
  const emptyRaw = Number(r.emptyCapacity);
  const available = Math.max(0, Number.isFinite(emptyRaw) ? emptyRaw : 0);
  const isOpen = Number(r.isOpen) === 1;
  const occupancy =
    capacity > 0
      ? Math.min(100, Math.max(0, Math.round(((capacity - available) / capacity) * 100)))
      : null;
  const occupied = capacity > 0 ? Math.max(0, capacity - available) : 0;
  const parkType = (r.parkType || '').trim();
  return {
    id: r.parkID,
    name: (r.parkName || '').trim(),
    lat: Number(r.lat),
    lng: Number(r.lng),
    capacity,
    available,
    occupied,
    occupancy,
    band: bandOf(occupancy, isOpen),
    district: (r.district || '').trim(),
    parkType,
    isCovered: /KAPALI/i.test(parkType),
    workHours: (r.workHours || '').trim(),
    freeTime: Number(r.freeTime) || 0,
    isOpen,
  };
}

export function parseTariff(t: string | null | undefined): TariffRow[] {
  if (!t) return [];
  return t
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((row) => {
      const idx = row.lastIndexOf(':');
      if (idx === -1) return { label: row, price: '' };
      return { label: row.slice(0, idx).trim(), price: row.slice(idx + 1).trim() };
    });
}

const ISPARK_BASE = 'https://api.ibb.gov.tr/ispark';

export async function fetchParks(): Promise<Park[]> {
  const res = await fetch(`${ISPARK_BASE}/Park`, { next: { revalidate: 30 } });
  if (!res.ok) throw new Error(`İSPARK Park ${res.status}`);
  const raw: RawPark[] = await res.json();
  return raw.map(normalizePark).filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng));
}

interface RawParkDetail extends Partial<RawPark> {
  parkID: number;
  address?: string;
  locationName?: string;
  monthlyFee?: number;
  tariff?: string;
  updateDate?: string;
}

export async function fetchParkDetail(id: number): Promise<ParkDetail | null> {
  const res = await fetch(`${ISPARK_BASE}/ParkDetay?id=${id}`, { next: { revalidate: 30 } });
  if (!res.ok) throw new Error(`İSPARK ParkDetay ${res.status}`);
  const arr: RawParkDetail[] = await res.json();
  const r = Array.isArray(arr) ? arr[0] : null;
  if (!r) return null;
  // ParkDetay omits isOpen; default to open so occupancy is computed from capacity.
  const base = normalizePark({
    parkID: r.parkID,
    parkName: r.parkName ?? '',
    lat: r.lat ?? '0',
    lng: r.lng ?? '0',
    capacity: r.capacity ?? 0,
    emptyCapacity: r.emptyCapacity ?? 0,
    workHours: r.workHours ?? '',
    parkType: r.parkType ?? '',
    freeTime: r.freeTime ?? 0,
    district: r.district ?? '',
    isOpen: r.isOpen ?? 1,
  });
  return {
    ...base,
    address: (r.address || '').trim(),
    locationName: (r.locationName || '').trim(),
    monthlyFee: typeof r.monthlyFee === 'number' ? r.monthlyFee : null,
    tariff: parseTariff(r.tariff),
    updateDate: r.updateDate || null,
  };
}
