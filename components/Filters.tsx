'use client';

export type SortKey = 'availability' | 'name' | 'distance';

export function Filters({
  hideClosed,
  onHideClosed,
  sort,
  onSort,
  canSortByDistance,
}: {
  hideClosed: boolean;
  onHideClosed: (v: boolean) => void;
  sort: SortKey;
  onSort: (v: SortKey) => void;
  canSortByDistance: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <label className="flex cursor-pointer items-center gap-2 text-xs text-white/60">
        <input
          type="checkbox"
          checked={hideClosed}
          onChange={(e) => onHideClosed(e.target.checked)}
          className="h-3.5 w-3.5 accent-blue-500"
        />
        Verisi olmayan otoparkları gizle
      </label>
      <select
        value={sort}
        onChange={(e) => onSort(e.target.value as SortKey)}
        aria-label="Sıralama"
        className="rounded border border-white/10 bg-white/5 px-2 py-1 text-xs text-white/70 focus:outline-none"
      >
        <option value="availability">En boş</option>
        <option value="name">İsim (A→Z)</option>
        <option value="distance" disabled={!canSortByDistance}>
          Yakınlık
        </option>
      </select>
    </div>
  );
}
