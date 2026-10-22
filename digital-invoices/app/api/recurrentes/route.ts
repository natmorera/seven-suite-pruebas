import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { FRECUENCIAS } from '@/lib/recurrencia';
import { conPaisDeSolicitud } from '@/lib/paisServidor';

// Programación de documentos recurrentes (una por documento original).
async function manejarGET() {
  const db = await getDb();
  const { rows } = await db.execute(`SELECT r.*, d.numero_factura, d.cliente_nombre, d.tipo, d.total, d.moneda
    FROM documentos_recurrentes r LEFT JOIN documentos_emitidos d ON d.id = r.documento_id ORDER BY r.proxima`);
  return NextResponse.json(rows);
}

async function manejarPOST(req: NextRequest) {
  const b = await req.json();
  const documentoId = String(b.documentoId ?? '');
  const frecuencia = String(b.frecuencia ?? '');
  const proxima = String(b.proxima ?? '');
  if (!documentoId || !FRECUENCIAS.some(f => f.value === frecuencia) || !/^\d{4}-\d{2}-\d{2}$/.test(proxima)) {
    return NextResponse.json({ error: 'Elige la frecuencia y la fecha de la próxima factura.' }, { status: 400 });
  }
  const fin = /^\d{4}-\d{2}-\d{2}$/.test(String(b.fin ?? '')) ? String(b.fin) : '';
  // automatica: se emite sola al llegar la fecha · revisar: avisa y se emite con un clic
  const modo = b.modo === 'automatica' ? 'automatica' : 'revisar';
  const db = await getDb();
  const { rows } = await db.execute({ sql: 'SELECT id FROM documentos_recurrentes WHERE documento_id = ?', args: [documentoId] });
  if (rows[0]) {
    await db.execute({ sql: 'UPDATE documentos_recurrentes SET frecuencia = ?, proxima = ?, fin = ?, modo = ?, activa = 1 WHERE id = ?', args: [frecuencia, proxima, fin, modo, String(rows[0].id)] });
  } else {
    await db.execute({ sql: 'INSERT INTO documentos_recurrentes (id, documento_id, frecuencia, proxima, fin, modo, activa, creado) VALUES (?, ?, ?, ?, ?, ?, 1, ?)',
      args: ['rec-' + Math.random().toString(36).slice(2, 10), documentoId, frecuencia, proxima, fin, modo, new Date().toISOString()] });
  }
  await db.execute({ sql: 'UPDATE documentos_emitidos SET recurrente = 1 WHERE id = ?', args: [documentoId] });
  return NextResponse.json({ ok: true });
}

async function manejarDELETE(req: NextRequest) {
  const documentoId = req.nextUrl.searchParams.get('documento') ?? '';
  const db = await getDb();
  await db.execute({ sql: 'DELETE FROM documentos_recurrentes WHERE documento_id = ?', args: [documentoId] });
  await db.execute({ sql: 'UPDATE documentos_emitidos SET recurrente = 0 WHERE id = ?', args: [documentoId] });
  return NextResponse.json({ ok: true });
}

// Cada solicitud corre con el país de la empresa elegida
export const GET = conPaisDeSolicitud(manejarGET);
export const POST = conPaisDeSolicitud(manejarPOST);
export const DELETE = conPaisDeSolicitud(manejarDELETE);
