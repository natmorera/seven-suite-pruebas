import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { leerModulos, guardarModulos, MODO_FIJO } from '@/lib/modulos';
import { conPaisDeSolicitud } from '@/lib/paisServidor';

async function manejarGET() {
  return NextResponse.json(await leerModulos(await getDb()));
}
async function manejarPUT(req: NextRequest) {
  const db = await getDb();
  if (MODO_FIJO) return NextResponse.json(await leerModulos(db));
  const b = await req.json().catch(() => ({}));
  const m = { contabilidad: b.contabilidad !== false, facturacion: b.facturacion !== false };
  await guardarModulos(db, m);
  return NextResponse.json(m);
}

// Cada solicitud corre con el país de la empresa elegida
export const GET = conPaisDeSolicitud(manejarGET);
export const PUT = conPaisDeSolicitud(manejarPUT);
