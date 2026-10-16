import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

// Búsqueda en el catálogo CABYS guardado en la base: ?q=texto o código (parcial)
export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get('q') ?? '').trim();
  const db = await getDb();
  const digitos = (q.match(/^[\d\s.-]+/)?.[0] ?? '').replace(/\D/g, '');
  const { rows } = digitos.length >= 2
    ? await db.execute({ sql: 'SELECT codigo, descripcion, impuesto FROM cabys_catalogo WHERE codigo LIKE ? ORDER BY codigo LIMIT 25', args: [digitos.slice(0, 13) + '%'] })
    : q.length >= 3
      ? await db.execute({ sql: 'SELECT codigo, descripcion, impuesto FROM cabys_catalogo WHERE descripcion LIKE ? ORDER BY length(descripcion) LIMIT 25', args: ['%' + q + '%'] })
      : { rows: [] };
  return NextResponse.json(rows.map(r => ({ codigo: String(r.codigo), descripcion: String(r.descripcion), impuesto: Number(r.impuesto ?? 13) })));
}
