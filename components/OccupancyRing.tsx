import { BAND_COLORS, type OccupancyBand } from '@/lib/ispark';

/**
 * The card "small image": a donut ring whose arc length + color encode occupancy,
 * with a parking "P" glyph (and a roof mark for covered lots) in the center.
 */
export function OccupancyRing({
  occupancy,
  band,
  covered,
  size = 48,
}: {
  occupancy: number | null;
  band: OccupancyBand;
  covered: boolean;
  size?: number;
}) {
  const stroke = Math.max(4, Math.round(size * 0.1));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const isUnknown = band === 'unknown' || occupancy === null;
  const dash = ((occupancy ?? 0) / 100) * c;
  const color = BAND_COLORS[band];
  const mid = size / 2;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="shrink-0"
      role="img"
      aria-label={occupancy === null ? 'Doluluk bilinmiyor' : `Doluluk %${occupancy}`}
    >
      <circle cx={mid} cy={mid} r={r} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth={stroke} />
      {!isUnknown && (
        <circle
          cx={mid}
          cy={mid}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeDasharray={`${dash} ${c}`}
          strokeLinecap="round"
          transform={`rotate(-90 ${mid} ${mid})`}
        />
      )}
      {covered && (
        <path
          d={`M ${mid - size * 0.18} ${mid - size * 0.05} L ${mid} ${mid - size * 0.19} L ${mid + size * 0.18} ${mid - size * 0.05}`}
          fill="none"
          stroke={color}
          strokeWidth={Math.max(1.5, size * 0.04)}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
      <text
        x={mid}
        y={mid}
        textAnchor="middle"
        dominantBaseline="central"
        dy={covered ? size * 0.06 : 0}
        fontSize={size * 0.36}
        fontWeight={800}
        fill="#fff"
      >
        {isUnknown ? '?' : 'P'}
      </text>
    </svg>
  );
}
