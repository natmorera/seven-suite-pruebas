import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { crearAsientoPorDocumento, crearAsientoPorCompra } from '@/lib/asientoAutomatico';
import { registrarCompraDeFec, TIPO_FEC } from '@/lib/fec';

// Genera el asiento de una venta aceptada que quedó sin asiento. Si ya tiene,
// devuelve el existente (no se duplica).
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await getDb();
  const { rows } = await db.execute({ sql: 'SELECT estado, tipo, compra_id FROM documentos_emitidos WHERE id = ?', args: ['#' + id] });
  if (!rows[0]) return NextResponse.json({ error: 'No se encontró el documento.' }, { status: 404 });
  if (String(rows[0].estado) !== 'Aceptado') return NextResponse.json({ error: 'Solo los documentos aceptados por Hacienda generan asiento.' }, { status: 409 });
  if (String(rows[0].tipo) === TIPO_FEC) {
    const c = rows[0].compra_id ? { compraId: String(rows[0].compra_id) } : await registrarCompraDeFec(db, '#' + id);
    if (!c.compraId) return NextResponse.json({ error: 'error' in c ? c.error : 'No se pudo registrar la compra.' }, { status: 400 });
    return NextResponse.json(await crearAsientoPorCompra(c.compraId));
  }
  const r = await crearAsientoPorDocumento('#' + id);
  if ('error' in r && r.error) return NextResponse.json(r, { status: 400 });
  return NextResponse.json(r);
}
