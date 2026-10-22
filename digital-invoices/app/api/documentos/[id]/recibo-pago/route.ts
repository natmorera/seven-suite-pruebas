import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { registrarAbono, estadoCredito } from '@/lib/reciboPago';
import { conPaisDeSolicitud } from '@/lib/paisServidor';

// GET: estado del crédito (total, abonado, saldo, IVA y plazo de 90 días) con
// sus abonos. POST: registra un abono ({ fechaPago, monto, medio, descripcion,
// comprobante }) y emite el recibo electrónico de pago.
async function manejarGET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return NextResponse.json(await estadoCredito(await getDb(), '#' + id));
}

async function manejarPOST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const b = await req.json().catch(() => ({}));
  const r = await registrarAbono(await getDb(), '#' + id, {
    fechaPago: String(b.fechaPago ?? ''), monto: Number(b.monto), medio: String(b.medio ?? ''),
    descripcion: b.descripcion ? String(b.descripcion) : undefined, comprobante: b.comprobante ? String(b.comprobante) : undefined,
  });
  if ('error' in r) return NextResponse.json(r, { status: 400 });
  return NextResponse.json(r);
}

// Cada solicitud corre con el país de la empresa elegida
export const GET = conPaisDeSolicitud(manejarGET);
export const POST = conPaisDeSolicitud(manejarPOST);
