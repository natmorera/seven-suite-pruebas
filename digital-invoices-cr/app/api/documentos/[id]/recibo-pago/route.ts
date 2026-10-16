import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { registrarAbono, estadoCredito } from '@/lib/reciboPago';

// GET: estado del crédito (total, abonado, saldo, IVA y plazo de 90 días) con
// sus abonos. POST: registra un abono ({ fechaPago, monto, medio, descripcion,
// comprobante }) y emite el recibo electrónico de pago.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return NextResponse.json(await estadoCredito(await getDb(), '#' + id));
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const b = await req.json().catch(() => ({}));
  const r = await registrarAbono(await getDb(), '#' + id, {
    fechaPago: String(b.fechaPago ?? ''), monto: Number(b.monto), medio: String(b.medio ?? ''),
    descripcion: b.descripcion ? String(b.descripcion) : undefined, comprobante: b.comprobante ? String(b.comprobante) : undefined,
  });
  if ('error' in r) return NextResponse.json(r, { status: 400 });
  return NextResponse.json(r);
}
