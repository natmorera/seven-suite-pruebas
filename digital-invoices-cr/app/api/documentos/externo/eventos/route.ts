import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

// Eventos para los módulos de origen: documentos anulados, reemplazados o
// rechazados en Facturación electrónica. ?origen=Front Desk filtra por
// módulo; ?todos=1 incluye los ya leídos.
export async function GET(req: NextRequest) {
  const db = await getDb();
  const origen = req.nextUrl.searchParams.get('origen');
  const todos = req.nextUrl.searchParams.get('todos') === '1';
  const filtros = [todos ? '' : 'leido = 0', origen ? 'origen = ?' : ''].filter(Boolean);
  const { rows } = await db.execute({
    sql: `SELECT * FROM eventos_origen ${filtros.length ? 'WHERE ' + filtros.join(' AND ') : ''} ORDER BY fecha`,
    args: origen ? [origen] : [],
  });
  return NextResponse.json(rows);
}

// Marca eventos como leídos: { ids: [...] }
export async function POST(req: NextRequest) {
  const db = await getDb();
  const body = await req.json().catch(() => ({}));
  const ids: string[] = Array.isArray(body?.ids) ? body.ids.map(String) : [];
  if (!ids.length) return NextResponse.json({ error: 'Indica los ids de los eventos.' }, { status: 400 });
  await db.execute({ sql: `UPDATE eventos_origen SET leido = 1 WHERE id IN (${ids.map(() => '?').join(',')})`, args: ids });
  return NextResponse.json({ ok: true });
}
