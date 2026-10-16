import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { leerImpresion, guardarImpresion, type DatosImpresion } from '@/lib/empresaDocumentos';

export async function GET() {
  return NextResponse.json(await leerImpresion(await getDb()));
}

export async function PUT(req: NextRequest) {
  const d = await req.json().catch(() => null) as DatosImpresion;
  const db = await getDb();
  const error = await guardarImpresion(db, d);
  if (error) return NextResponse.json({ error }, { status: 400 });
  return NextResponse.json(await leerImpresion(db));
}
