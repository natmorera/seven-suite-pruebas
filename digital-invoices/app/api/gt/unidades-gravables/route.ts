import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { leerUnidadesGravables, guardarUnidadesGravables } from '@/lib/unidadesGravablesGT';
import { conPaisDeSolicitud } from '@/lib/paisServidor';

async function manejarGET() {
  return NextResponse.json(await leerUnidadesGravables(await getDb()));
}

async function manejarPUT(req: NextRequest) {
  const db = await getDb();
  await guardarUnidadesGravables(db, await req.json());
  return NextResponse.json(await leerUnidadesGravables(db));
}

// Cada solicitud corre con el país de la empresa elegida
export const GET = conPaisDeSolicitud(manejarGET);
export const PUT = conPaisDeSolicitud(manejarPUT);
