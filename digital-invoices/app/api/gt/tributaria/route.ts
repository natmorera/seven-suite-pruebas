import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { leerTributariaGT, guardarTributariaGT } from '@/lib/tributariaGT';
import { conPaisDeSolicitud } from '@/lib/paisServidor';

async function manejarGET() {
  return NextResponse.json(await leerTributariaGT(await getDb()));
}

async function manejarPUT(req: NextRequest) {
  const db = await getDb();
  const error = await guardarTributariaGT(db, await req.json());
  if (error) return NextResponse.json({ error }, { status: 400 });
  return NextResponse.json(await leerTributariaGT(db));
}

// Cada solicitud corre con el país de la empresa elegida
export const GET = conPaisDeSolicitud(manejarGET);
export const PUT = conPaisDeSolicitud(manejarPUT);
