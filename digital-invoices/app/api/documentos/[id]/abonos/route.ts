import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { conPaisDeSolicitud } from '@/lib/paisServidor';
import type { AbonoFcam } from '@/lib/perfilPais';

// Guatemala, factura cambiaria: confirma el pago de un abono (o lo deshace).
// Cuerpo: { numero, fecha, medio, comprobante } o { numero, deshacer: true }.
async function manejarPATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const b = await req.json().catch(() => ({})) as { numero?: number; fecha?: string; medio?: string; comprobante?: string; deshacer?: boolean };
  const db = await getDb();
  const docId = id.startsWith('#') ? id : `#${id}`;
  const { rows } = await db.execute({ sql: 'SELECT abonos_json FROM documentos_emitidos WHERE id = ? OR id = ?', args: [docId, id] });
  if (!rows[0]) return NextResponse.json({ error: 'No se encontró el documento.' }, { status: 404 });
  let abonos: AbonoFcam[] = [];
  try { abonos = JSON.parse(String(rows[0].abonos_json ?? '[]')); } catch { abonos = []; }
  const abono = abonos.find(a => a.numero === Number(b.numero));
  if (!abono) return NextResponse.json({ error: 'No se encontró el abono.' }, { status: 404 });
  if (b.deshacer) abono.pagado = null;
  else {
    if (!b.fecha || !/^\d{4}-\d{2}-\d{2}$/.test(b.fecha)) return NextResponse.json({ error: 'Indica la fecha en que se cobró.' }, { status: 400 });
    if (!b.medio) return NextResponse.json({ error: 'Elige el medio de pago.' }, { status: 400 });
    abono.pagado = { fecha: b.fecha, medio: b.medio, ...(b.comprobante?.trim() ? { comprobante: b.comprobante.trim() } : {}) };
  }
  await db.execute({ sql: 'UPDATE documentos_emitidos SET abonos_json = ? WHERE id = ? OR id = ?', args: [JSON.stringify(abonos), docId, id] });
  return NextResponse.json(abonos);
}

// Cada solicitud corre con el país de la empresa elegida
export const PATCH = conPaisDeSolicitud(manejarPATCH);
