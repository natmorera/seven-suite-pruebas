import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { crearAsientoPorCompra } from '@/lib/asientoAutomatico';

// Genera el asiento de una compra aceptada que quedó sin asiento (por
// ejemplo, si al emitir el acuse se eligió «No, solo el acuse»).
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await getDb();
  const { rows } = await db.execute({ sql: 'SELECT estado FROM documentos_recibidos WHERE id = ?', args: [id] });
  if (!rows[0]) return NextResponse.json({ error: 'No se encontró la compra.' }, { status: 404 });
  if (String(rows[0].estado) !== 'Aceptado') return NextResponse.json({ error: 'Primero emite el acuse de aceptación.' }, { status: 409 });
  const r = await crearAsientoPorCompra(id);
  if ('error' in r && r.error) return NextResponse.json(r, { status: 400 });
  return NextResponse.json(r);
}
