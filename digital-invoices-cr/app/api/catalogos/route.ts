import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

// Catálogos de Hacienda guardados en la base: ?nombre=medios_pago
export async function GET(req: NextRequest) {
  const nombre = req.nextUrl.searchParams.get('nombre') ?? '';
  const db = await getDb();
  const { rows } = await db.execute({ sql: 'SELECT codigo AS value, descripcion AS label FROM catalogos_hacienda WHERE catalogo = ? AND activo = 1 ORDER BY orden, codigo', args: [nombre] });
  return NextResponse.json(rows);
}
