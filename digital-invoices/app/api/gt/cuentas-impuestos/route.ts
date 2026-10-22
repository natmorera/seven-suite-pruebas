import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { leerCuentasImpuestos, guardarCuentasImpuestos } from '@/lib/cuentasImpuestosGT';
import { conPaisDeSolicitud } from '@/lib/paisServidor';

async function manejarGET() {
  return NextResponse.json(await leerCuentasImpuestos(await getDb()));
}

async function manejarPUT(req: NextRequest) {
  const db = await getDb();
  await guardarCuentasImpuestos(db, await req.json());
  return NextResponse.json(await leerCuentasImpuestos(db));
}

// Cada solicitud corre con el país de la empresa elegida
export const GET = conPaisDeSolicitud(manejarGET);
export const PUT = conPaisDeSolicitud(manejarPUT);
