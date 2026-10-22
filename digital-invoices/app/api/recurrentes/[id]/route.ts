import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { avanzarRecurrencia, emitirCopia } from '@/lib/emitirCopia';
import { conPaisDeSolicitud } from '@/lib/paisServidor';

// Se emitió la factura de este período: avanza a la siguiente fecha (o
// termina la recurrencia si ya pasó la fecha de fin).
async function manejarPATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const b = await req.json().catch(() => ({}));
  const db = await getDb();
  const { rows } = await db.execute({ sql: 'SELECT * FROM documentos_recurrentes WHERE id = ?', args: [id] });
  const r = rows[0];
  if (!r) return NextResponse.json({ error: 'No encontrada.' }, { status: 404 });
  if (b.accion === 'emitida' && b.documentoId) await db.execute({ sql: 'UPDATE documentos_emitidos SET recurrencia_id = ? WHERE id = ?', args: [id, String(b.documentoId)] });
  if (b.accion === 'emitida' || b.accion === 'omitir') {
    return NextResponse.json({ ok: true, ...(await avanzarRecurrencia(db, id, b.accion)) });
  }
  if (b.accion === 'emitir') {
    const res = await emitirCopia(db, String(r.documento_id), { observaciones: 'Factura recurrente' });
    if ('error' in res) return NextResponse.json(res, { status: 400 });
    await db.execute({ sql: 'UPDATE documentos_emitidos SET recurrencia_id = ? WHERE id = ?', args: [id, res.id] });
    const av = await avanzarRecurrencia(db, id, 'emitida');
    return NextResponse.json({ ok: true, consecutivo: res.consecutivo, documentoId: res.id, ...av });
  }
  if (b.modo === 'automatica' || b.modo === 'revisar') await db.execute({ sql: 'UPDATE documentos_recurrentes SET modo = ? WHERE id = ?', args: [b.modo, id] });
  if ('activa' in b) await db.execute({ sql: 'UPDATE documentos_recurrentes SET activa = ? WHERE id = ?', args: [b.activa ? 1 : 0, id] });
  return NextResponse.json({ ok: true });
}

// Cada solicitud corre con el país de la empresa elegida
export const PATCH = conPaisDeSolicitud(manejarPATCH);
