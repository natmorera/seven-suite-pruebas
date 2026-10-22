import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { construirXml } from '@/lib/xml';
import { construirAcuse } from '@/lib/acuse';
import { conPaisDeSolicitud } from '@/lib/paisServidor';

// Archivos de un comprobante para descargar: el XML enviado y la respuesta
// de Hacienda. Los documentos que llegaron sin XML guardado (integraciones
// viejas o datos de ejemplo) lo generan aquí desde sus datos, para que la
// descarga funcione siempre.
async function manejarGET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: idParam } = await params;
  const id = '#' + idParam;
  const db = await getDb();
  const { rows } = await db.execute({ sql: 'SELECT * FROM documentos_emitidos WHERE id = ?', args: [id] });
  const d = rows[0] as Record<string, unknown> | undefined;
  if (!d) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });

  let xml = String(d.xml ?? '');
  if (!xml.trim()) {
    const [{ rows: lineas }, { rows: em }, { rows: caja }] = await Promise.all([
      db.execute({ sql: 'SELECT * FROM documentos_emitidos_lineas WHERE documento_id = ?', args: [id] }),
      db.execute({ sql: 'SELECT * FROM emisores WHERE id = ?', args: [String(d.emisor_id ?? 'em-1')] }),
      db.execute({ sql: 'SELECT * FROM cajas WHERE id = ?', args: [String(d.caja_id ?? '')] }),
    ]);
    const emisor = (em[0] ?? (await db.execute('SELECT * FROM emisores LIMIT 1')).rows[0]) as Record<string, unknown>;
    const numero = String(d.numero_factura ?? '').slice(-10).padStart(10, '0');
    const lineasXml = lineas.length ? lineas.map((l, i) => ({
      numero: i + 1, codigoCabys: String(l.codigo_cabys ?? ''), descripcion: String(l.descripcion ?? ''),
      cantidad: Number(l.cantidad ?? 1), precioUnitario: Number(l.precio_unitario ?? 0), impuestoPorcentaje: Number(l.impuesto ?? 13),
      codigoTarifa: String(l.codigo_tarifa ?? '08'),
    })) : [{
      numero: 1, codigoCabys: '6311100000000', descripcion: 'Servicios de hospedaje', cantidad: 1,
      precioUnitario: Number(d.subtotal ?? 0), impuestoPorcentaje: 13, codigoTarifa: '08',
    }];
    xml = construirXml({
      tipoDocumento: String(d.tipo ?? 'Factura electrónica'), consecutivo: numero,
      sucursal: String(caja[0]?.sucursal ?? '001'), terminal: String(caja[0]?.terminal ?? '00001'),
      fechaEmision: new Date(String(d.fecha_emision)),
      emisor: { nombre: String(emisor?.nombre_comercial ?? ''), cedulaJuridica: String(emisor?.cedula_juridica ?? ''), actividadEconomica: String(emisor?.actividad_economica ?? '') },
      receptor: d.tipo === 'Tiquete electrónico' ? null : { nombre: String(d.cliente_nombre ?? ''), tipoIdentificacion: String(d.receptor_tipo_identificacion ?? '02'), numeroIdentificacion: String(d.receptor_identificacion ?? '0000000000'), email: d.receptor_email ? String(d.receptor_email) : undefined },
      condicionVenta: String(d.condicion_venta ?? '01'), moneda: (d.moneda === 'USD' ? 'USD' : 'CRC'), tipoCambio: Number(d.tipo_cambio ?? 1),
      lineas: lineasXml, medioPago: ['01'],
    }).xml;
  }

  const estado = String(d.estado ?? '');
  const respuesta = d.respuesta_xml ? String(d.respuesta_xml)
    : (estado === 'Aceptado' || estado === 'Rechazado') ? construirAcuse({
        clave: String(d.clave ?? ''), fechaEmisionDoc: String(d.fecha_emision), cedulaEmisor: '',
        totalImpuesto: Number(d.iva ?? 0), totalFactura: Number(d.total ?? 0), aceptado: estado === 'Aceptado',
      }) : null;
  return NextResponse.json({ xml, respuesta, estado });
}

// Cada solicitud corre con el país de la empresa elegida
export const GET = conPaisDeSolicitud(manejarGET);
