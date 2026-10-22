import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { verificarCertificadorGT } from '@/lib/tributariaGT';
import { conPaisDeSolicitud } from '@/lib/paisServidor';

async function manejarPOST(req: NextRequest) {
  const { id } = await req.json();
  const r = await verificarCertificadorGT(await getDb(), String(id ?? ''));
  return NextResponse.json(r, { status: r.ok ? 200 : 400 });
}

// Cada solicitud corre con el país de la empresa elegida
export const POST = conPaisDeSolicitud(manejarPOST);
