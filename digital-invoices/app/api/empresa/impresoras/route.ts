import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { leerImpresion, guardarImpresion, type DatosImpresion } from '@/lib/empresaDocumentos';
import { conPaisDeSolicitud } from '@/lib/paisServidor';

async function manejarGET() {
  return NextResponse.json(await leerImpresion(await getDb()));
}

async function manejarPUT(req: NextRequest) {
  const d = await req.json().catch(() => null) as DatosImpresion;
  const db = await getDb();
  const error = await guardarImpresion(db, d);
  if (error) return NextResponse.json({ error }, { status: 400 });
  return NextResponse.json(await leerImpresion(db));
}

// Cada solicitud corre con el país de la empresa elegida
export const GET = conPaisDeSolicitud(manejarGET);
export const PUT = conPaisDeSolicitud(manejarPUT);
