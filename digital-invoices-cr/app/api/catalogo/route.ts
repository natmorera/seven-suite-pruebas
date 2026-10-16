import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { leerCatalogo, guardarCatalogo } from '@/lib/catalogoCuentas';

export async function GET() {
  return NextResponse.json(await leerCatalogo(await getDb()));
}

export async function PUT(req: NextRequest) {
  const arbol = await req.json().catch(() => null);
  if (!Array.isArray(arbol) || !arbol.length) return NextResponse.json({ error: 'El catálogo está vacío.' }, { status: 400 });
  await guardarCatalogo(await getDb(), arbol);
  return NextResponse.json({ ok: true });
}
