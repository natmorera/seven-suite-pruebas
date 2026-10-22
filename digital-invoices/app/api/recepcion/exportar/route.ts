import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { crearZip } from '@/lib/zip';
import { conPaisDeSolicitud } from '@/lib/paisServidor';

// Exporta compras: ?ids=a,b,c (o todas si no se indica). Devuelve un .zip con
// el XML de cada factura, la respuesta de Hacienda si la hay y un resumen.csv.
async function manejarGET(req: NextRequest) {
  const db = await getDb();
  const ids = (req.nextUrl.searchParams.get('ids') ?? '').split(',').map(s => s.trim()).filter(Boolean);
  const { rows } = await db.execute({
    sql: `SELECT d.id, d.proveedor, d.proveedor_identificacion, d.numero_factura, d.clave, d.fecha_emision, d.estado, d.moneda, d.subtotal, d.iva, d.total_factura, d.xml,
            (SELECT c.xml_respuesta FROM correos c WHERE c.id = d.correo_id) AS xml_respuesta
          FROM documentos_recibidos d ${ids.length ? `WHERE d.id IN (${ids.map(() => '?').join(',')})` : ''} ORDER BY d.fecha_emision`,
    args: ids,
  });
  const csv = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const resumen = ['Proveedor,Identificación,Número,Clave,Fecha,Estado,Moneda,Subtotal,IVA,Total,XML incluido',
    ...rows.map(r => [r.proveedor, r.proveedor_identificacion, r.numero_factura, r.clave, String(r.fecha_emision ?? '').slice(0, 10), r.estado, r.moneda ?? 'CRC', r.subtotal, r.iva, r.total_factura, r.xml ? 'Sí' : 'No'].map(csv).join(','))];
  const archivos: { nombre: string; contenido: string }[] = [{ nombre: 'resumen.csv', contenido: '\ufeff' + resumen.join('\r\n') }];
  for (const r of rows) {
    const base = String(r.clave || r.numero_factura || r.id);
    if (r.xml) archivos.push({ nombre: `${base}.xml`, contenido: String(r.xml) });
    if (r.xml_respuesta) archivos.push({ nombre: `${base}-respuesta.xml`, contenido: String(r.xml_respuesta) });
  }
  const zip = crearZip(archivos);
  return new NextResponse(Buffer.from(zip), {
    headers: { 'Content-Type': 'application/zip', 'Content-Disposition': `attachment; filename="compras-xml-${new Date().toISOString().slice(0, 10)}.zip"` },
  });
}

// Cada solicitud corre con el país de la empresa elegida
export const GET = conPaisDeSolicitud(manejarGET);
