'use client';

import useSWR from 'swr';
import { useEffect, useState } from 'react';
import type { Park } from './ispark';

const fetcher = async (url: string): Promise<Park[]> => {
  const res = await fetch(url);
  if (!res.ok) throw new Error('İSPARK verisi alınamadı');
  return res.json();
};

/** Polls the live parking list every 30s. */
export function useParks() {
  const { data, error, isLoading, mutate } = useSWR<Park[]>('/api/parks', fetcher, {
    refreshInterval: 30_000,
    revalidateOnFocus: true,
    keepPreviousData: true,
  });

  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  useEffect(() => {
    if (data) setLastUpdated(new Date());
  }, [data]);

  return {
    parks: data ?? [],
    error,
    isLoading,
    lastUpdated,
    refresh: () => mutate(),
  };
}
