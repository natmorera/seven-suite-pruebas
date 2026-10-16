import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { leerModulos, guardarModulos, MODO_FIJO } from '@/lib/modulos';

export async function GET() {
  return NextResponse.json(await leerModulos(await getDb()));
}
export async function PUT(req: NextRequest) {
  const db = await getDb();
  if (MODO_FIJO) return NextResponse.json(await leerModulos(db));
  const b = await req.json().catch(() => ({}));
  const m = { contabilidad: b.contabilidad !== false, facturacion: b.facturacion !== false };
  await guardarModulos(db, m);
  return NextResponse.json(m);
}
