import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

// Facturas recurrentes que se emitieron solas y que todavía no se han visto
// en el aviso del Dashboard.
export async function GET() {
  const db = await getDb();
  const { rows } = await db.execute(`
    SELECT id, tipo, numero_factura, cliente_nombre, receptor_email, fecha_emision, total, moneda,
           COALESCE(envio_correo, '') AS envio_correo
    FROM documentos_emitidos
    WHERE COALESCE(emitida_sola, 0) = 1 AND COALESCE(aviso_visto, 0) = 0
    ORDER BY fecha_emision DESC
  `);
  return NextResponse.json(rows);
}

// Marca el aviso como visto (todas o solo las indicadas).
export async function POST(req: NextRequest) {
  const db = await getDb();
  const body = await req.json().catch(() => ({}));
  const ids: string[] = Array.isArray(body?.ids) ? body.ids.map(String) : [];
  if (ids.length) {
    await db.execute({ sql: `UPDATE documentos_emitidos SET aviso_visto = 1 WHERE id IN (${ids.map(() => '?').join(',')})`, args: ids });
  } else {
    await db.execute('UPDATE documentos_emitidos SET aviso_visto = 1 WHERE COALESCE(emitida_sola, 0) = 1');
  }
  return NextResponse.json({ ok: true });
}
