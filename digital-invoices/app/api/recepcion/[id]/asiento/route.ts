import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { crearAsientoPorCompra } from '@/lib/asientoAutomatico';
import { conPaisDeSolicitud } from '@/lib/paisServidor';

// Genera el asiento de una compra aceptada que quedó sin asiento (por
// ejemplo, si al emitir el acuse se eligió «No, solo el acuse»).
async function manejarPOST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await getDb();
  const { rows } = await db.execute({ sql: 'SELECT estado FROM documentos_recibidos WHERE id = ?', args: [id] });
  if (!rows[0]) return NextResponse.json({ error: 'No se encontró la compra.' }, { status: 404 });
  if (String(rows[0].estado) !== 'Aceptado') return NextResponse.json({ error: 'Primero emite el acuse de aceptación.' }, { status: 409 });
  const r = await crearAsientoPorCompra(id);
  if ('error' in r && r.error) return NextResponse.json(r, { status: 400 });
  return NextResponse.json(r);
}

// Cada solicitud corre con el país de la empresa elegida
export const POST = conPaisDeSolicitud(manejarPOST);
