import { NextResponse } from 'next/server';
import { fetchParkDetail } from '@/lib/ispark';

export const revalidate = 30;

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: 'Geçersiz id' }, { status: 400 });
  }
  try {
    const detail = await fetchParkDetail(id);
    if (!detail) return NextResponse.json({ error: 'Otopark bulunamadı' }, { status: 404 });
    return NextResponse.json(detail, {
      headers: { 'Cache-Control': 's-maxage=30, stale-while-revalidate=60' },
    });
  } catch {
    return NextResponse.json({ error: 'Otopark detayı alınamadı' }, { status: 502 });
  }
}
