import { NextResponse } from 'next/server';
import { obtenerTipoCambioVenta } from '@/lib/tipoCambio';

export async function GET() {
  return NextResponse.json(await obtenerTipoCambioVenta());
}
