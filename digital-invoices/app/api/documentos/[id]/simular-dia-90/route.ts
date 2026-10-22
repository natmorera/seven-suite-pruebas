import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { conPaisDeSolicitud } from '@/lib/paisServidor';

// Solo para demostraciones del prototipo: mueve la fecha de una factura con
// recibo de pago 91 días atrás, para ver qué pasa cuando se cumple el día 90
// (el IVA pendiente se declara aunque no hayan pagado).
async function manejarPOST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await getDb();
  const { rows } = await db.execute({ sql: `SELECT condicion_venta FROM documentos_emitidos WHERE id = ? AND tipo = 'Factura electrónica'`, args: ['#' + id] });
  if (!rows[0] || !['08', '10'].includes(String(rows[0].condicion_venta))) return NextResponse.json({ error: 'Solo aplica a facturas con recibo electrónico de pago.' }, { status: 400 });
  const d = new Date(); d.setDate(d.getDate() - 91);
  await db.execute({ sql: 'UPDATE documentos_emitidos SET fecha_emision = ? WHERE id = ?', args: [d.toISOString(), '#' + id] });
  return NextResponse.json({ ok: true, fecha: d.toISOString() });
}

// Cada solicitud corre con el país de la empresa elegida
export const POST = conPaisDeSolicitud(manejarPOST);
