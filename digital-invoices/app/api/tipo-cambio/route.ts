import { NextResponse } from 'next/server';
import { obtenerTipoCambioVenta } from '@/lib/tipoCambio';
import { conPaisDeSolicitud } from '@/lib/paisServidor';

async function manejarGET() {
  return NextResponse.json(await obtenerTipoCambioVenta());
}

// Cada solicitud corre con el país de la empresa elegida
export const GET = conPaisDeSolicitud(manejarGET);
