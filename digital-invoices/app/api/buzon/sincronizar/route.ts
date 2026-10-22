import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { sincronizar } from '@/lib/buzon';
import { conPaisDeSolicitud } from '@/lib/paisServidor';

export const maxDuration = 120;

async function manejarPOST() {
  return NextResponse.json(await sincronizar(await getDb()));
}

// Cada solicitud corre con el país de la empresa elegida
export const POST = conPaisDeSolicitud(manejarPOST);
