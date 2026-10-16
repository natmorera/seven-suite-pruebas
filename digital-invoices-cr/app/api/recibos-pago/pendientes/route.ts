import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { creditosAbiertos } from '@/lib/reciboPago';

// Ventas a crédito con recibo de pago: saldo, IVA pendiente y plazo de 90 días
export async function GET() {
  return NextResponse.json(await creditosAbiertos(await getDb()));
}
