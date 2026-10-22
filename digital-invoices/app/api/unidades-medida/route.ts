import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { leerUnidadesMedida, guardarUnidadesMedida } from '@/lib/unidadesMedida';
import { conPaisDeSolicitud } from '@/lib/paisServidor';

async function manejarGET() {
  return NextResponse.json(await leerUnidadesMedida(await getDb()));
}

async function manejarPUT(req: NextRequest) {
  const db = await getDb();
  await guardarUnidadesMedida(db, await req.json());
  return NextResponse.json(await leerUnidadesMedida(db));
}

// Cada solicitud corre con el país de la empresa elegida
export const GET = conPaisDeSolicitud(manejarGET);
export const PUT = conPaisDeSolicitud(manejarPUT);
