import { BAND_COLORS, BAND_LABELS, BAND_RANGES, type OccupancyBand } from '@/lib/ispark';

const ORDER: Exclude<OccupancyBand, 'unknown'>[] = ['available', 'filling', 'busy', 'full'];

export function Legend() {
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1.5">
      {ORDER.map((b) => (
        <div key={b} className="flex items-center gap-1.5 text-[11px] text-white/60">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: BAND_COLORS[b] }} />
          <span>{BAND_LABELS[b]}</span>
          <span className="text-white/35">{BAND_RANGES[b]}</span>
        </div>
      ))}
      <div className="flex items-center gap-1.5 text-[11px] text-white/60">
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: BAND_COLORS.unknown }} />
        <span>{BAND_LABELS.unknown}</span>
      </div>
    </div>
  );
}
