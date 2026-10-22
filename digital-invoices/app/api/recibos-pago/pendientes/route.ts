import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { creditosAbiertos } from '@/lib/reciboPago';
import { conPaisDeSolicitud } from '@/lib/paisServidor';

// Ventas a crédito con recibo de pago: saldo, IVA pendiente y plazo de 90 días
async function manejarGET() {
  return NextResponse.json(await creditosAbiertos(await getDb()));
}

// Cada solicitud corre con el país de la empresa elegida
export const GET = conPaisDeSolicitud(manejarGET);
