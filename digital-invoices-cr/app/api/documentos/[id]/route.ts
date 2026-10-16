import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { generarQrDataUrl } from '@/lib/qr';
import { urlConsultaHacienda } from '@/lib/clave';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: idParam } = await params;
  const id = '#' + idParam;
  const db = await getDb();
  const docRes = await db.execute({ sql: 'SELECT * FROM documentos_emitidos WHERE id = ?', args: [id] });
  const doc = docRes.rows[0];
  if (!doc) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
  const lineasRes = await db.execute({ sql: 'SELECT * FROM documentos_emitidos_lineas WHERE documento_id = ?', args: [id] });
  // Documentos sin líneas guardadas (llegaron del PMS/POS solo con totales): se
  // muestra una línea con el monto del encabezado para que el detalle no quede vacío.
  const lineas = lineasRes.rows.length ? lineasRes.rows : [{
    codigo_cabys: '6311100000000', descripcion: 'Servicios según documento de origen', cantidad: 1,
    precio_unitario: Number(doc.subtotal ?? 0), impuesto: Number(doc.subtotal) ? Math.round(Number(doc.iva ?? 0) / Number(doc.subtotal) * 100) : 13,
    codigo_tarifa: '08', descuento: 0, sintetica: 1,
  }];
  const [{ rows: em }, { rows: asiento }, { rows: cli }] = await Promise.all([
    db.execute({ sql: 'SELECT * FROM emisores WHERE id = ?', args: [String(doc.emisor_id ?? 'em-1')] }),
    db.execute({ sql: 'SELECT consecutivo FROM asientos WHERE documento_ref_id = ?', args: [id] }).catch(() => ({ rows: [] as Record<string, unknown>[] })),
    db.execute({ sql: 'SELECT * FROM clientes WHERE id = ? OR nombre = ? LIMIT 1', args: [String(doc.cliente_id ?? ''), String(doc.cliente_nombre ?? '')] }),
  ]);
  const emisor = em[0] ?? (await db.execute('SELECT * FROM emisores LIMIT 1')).rows[0] ?? null;
  const qr = doc.clave ? await generarQrDataUrl(urlConsultaHacienda(String(doc.clave))) : null;
  return NextResponse.json({
    ...doc, lineas, emisor, receptor: cli[0] ?? null, asiento_consecutivo: asiento[0]?.consecutivo ?? null,
    qr, urlConsulta: doc.clave ? urlConsultaHacienda(String(doc.clave)) : null,
  });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: idParam } = await params;
  const id = '#' + idParam;
  const db = await getDb();
  // Un documento emitido no se borra: ya tiene número y lo conoce Hacienda.
  // Solo se eliminan los borradores; lo emitido se anula con nota de crédito.
  const { rows } = await db.execute({ sql: 'SELECT estado FROM documentos_emitidos WHERE id = ?', args: [id] });
  if (rows[0] && String(rows[0].estado) !== 'Borrador') {
    return NextResponse.json({ error: 'Un documento emitido no se puede eliminar. Para anularlo, emite una nota de crédito.' }, { status: 409 });
  }
  await db.execute({ sql: 'DELETE FROM documentos_recurrentes WHERE documento_id = ?', args: [id] });
  await db.execute({ sql: 'DELETE FROM documentos_emitidos_lineas WHERE documento_id = ?', args: [id] });
  await db.execute({ sql: 'DELETE FROM documentos_emitidos WHERE id = ?', args: [id] });
  return NextResponse.json({ ok: true });
}
