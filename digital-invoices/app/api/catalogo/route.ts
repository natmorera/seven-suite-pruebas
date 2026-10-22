import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { leerCatalogo, guardarCatalogo } from '@/lib/catalogoCuentas';
import { conPaisDeSolicitud } from '@/lib/paisServidor';

async function manejarGET() {
  return NextResponse.json(await leerCatalogo(await getDb()));
}

async function manejarPUT(req: NextRequest) {
  const arbol = await req.json().catch(() => null);
  if (!Array.isArray(arbol) || !arbol.length) return NextResponse.json({ error: 'El catálogo está vacío.' }, { status: 400 });
  await guardarCatalogo(await getDb(), arbol);
  return NextResponse.json({ ok: true });
}

// Cada solicitud corre con el país de la empresa elegida
export const GET = conPaisDeSolicitud(manejarGET);
export const PUT = conPaisDeSolicitud(manejarPUT);
