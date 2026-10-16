import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

// Datos del bloque "Facturación electrónica" del Dashboard que no se pueden
// sacar de /api/documentos directamente.
//
// "No enviados por correo": comprobantes aceptados sin envío registrado. Se
// mira la marca del documento (envio_correo) y, para los envíos anteriores a
// esa marca, el asunto del correo en correos_enviados. Los envíos 'simulado'
// (sin SMTP configurado) cuentan como enviados.
export async function GET() {
  const db = await getDb();
  const { rows } = await db.execute(`
    SELECT d.id, d.tipo, d.numero_factura, d.cliente_nombre, d.receptor_email, d.fecha_emision, d.total, d.moneda
    FROM documentos_emitidos d
    WHERE d.estado = 'Aceptado'
      AND COALESCE(d.es_borrador, 0) = 0
      AND COALESCE(d.numero_factura, '') <> ''
      AND COALESCE(d.envio_correo, '') <> 'enviado'
      AND NOT EXISTS (
        SELECT 1 FROM correos_enviados c
        WHERE c.asunto = 'Factura electrónica ' || d.numero_factura
          AND c.estado IN ('enviado', 'simulado')
      )
    ORDER BY d.fecha_emision ASC
  `);
  return NextResponse.json({ sinCorreo: rows });
}
