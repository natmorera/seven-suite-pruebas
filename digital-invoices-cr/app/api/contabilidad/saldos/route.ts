import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { saldosMayor } from '@/lib/libroMayor';

// Saldos por cuenta: ?desde=AAAA-MM-DD&hasta=AAAA-MM-DD&pendientes=1&cc=Hotel
export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const hoy = new Date().toISOString().slice(0, 10);
  return NextResponse.json(await saldosMayor(await getDb(), p.get('desde') ?? hoy.slice(0, 4) + '-01-01', p.get('hasta') ?? hoy, p.get('pendientes') === '1', p.get('cc') ?? ''));
}
