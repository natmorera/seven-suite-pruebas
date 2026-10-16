import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { leerConsecutivos, guardarConsecutivo } from '@/lib/empresaDocumentos';
import type { Reinicio } from '@/lib/consecutivosDocumentos';

export async function GET() {
  return NextResponse.json(await leerConsecutivos(await getDb()));
}

export async function PUT(req: NextRequest) {
  const b = await req.json().catch(() => null) as { id?: string; formato?: string; reinicio?: Reinicio } | null;
  const db = await getDb();
  const error = await guardarConsecutivo(db, String(b?.id ?? ''), String(b?.formato ?? ''), (b?.reinicio ?? 'nunca') as Reinicio);
  if (error) return NextResponse.json({ error }, { status: 400 });
  return NextResponse.json(await leerConsecutivos(db));
}
