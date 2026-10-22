import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { enviarComprobante } from '@/lib/hacienda';
import { conPaisDeSolicitud } from '@/lib/paisServidor';

// Vuelve a enviar a Hacienda un comprobante que quedó en «Error» (no llegó).
// Usa el mismo XML firmado y la misma clave: no consume un número nuevo.
async function manejarPOST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: idParam } = await params;
  const id = '#' + idParam;
  const db = await getDb();
  const { rows } = await db.execute({ sql: 'SELECT d.*, e.cedula_juridica FROM documentos_emitidos d LEFT JOIN emisores e ON e.id = d.emisor_id WHERE d.id = ?', args: [id] });
  const doc = rows[0];
  if (!doc) return NextResponse.json({ error: 'No se encontró el documento.' }, { status: 404 });
  if (String(doc.estado) !== 'Error') return NextResponse.json({ error: 'Solo se reenvían los documentos que quedaron con error de envío.' }, { status: 409 });
  if (!doc.xml || !doc.clave) return NextResponse.json({ error: 'El documento no tiene XML guardado para reenviar.' }, { status: 400 });
  const envio = await enviarComprobante(String(doc.clave), Buffer.from(String(doc.xml)).toString('base64'), String(doc.cedula_juridica ?? ''), doc.receptor_identificacion ? String(doc.receptor_identificacion) : undefined);
  await db.execute({
    sql: `UPDATE documentos_emitidos SET estado = ?, estado_envio = ?, ultimo_error = ?, intentos_envio = COALESCE(intentos_envio, 0) + 1 WHERE id = ?`,
    args: [envio.estadoInicial, envio.error ? 'error' : envio.simulado ? 'simulado' : 'enviado', envio.error ?? null, id],
  });
  return NextResponse.json({ estado: envio.estadoInicial, error: envio.error ?? null });
}

// Cada solicitud corre con el país de la empresa elegida
export const POST = conPaisDeSolicitud(manejarPOST);
