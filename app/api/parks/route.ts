import { NextResponse } from 'next/server';
import { fetchParks } from '@/lib/ispark';

// Cache the upstream İSPARK response for ~30s so we don't hammer it per-client.
export const revalidate = 30;

export async function GET() {
  try {
    const parks = await fetchParks();
    return NextResponse.json(parks, {
      headers: { 'Cache-Control': 's-maxage=30, stale-while-revalidate=60' },
    });
  } catch {
    return NextResponse.json({ error: 'İSPARK verisi alınamadı' }, { status: 502 });
  }
}
