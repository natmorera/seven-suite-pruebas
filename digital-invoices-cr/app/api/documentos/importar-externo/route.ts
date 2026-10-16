import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

// Importar comprobantes que la empresa emitió con otro sistema (GTI, TRIBU-CR,
// etc.), para poder hacerles nota de crédito o débito desde aquí. Se guardan
// como aceptados y marcados como importados: no generan asiento ni suman en
// los reportes (ya los declaró el otro sistema). La nota debe salir con la
// misma sucursal y terminal del documento original.
const dig = (s: unknown) => String(s ?? '').replace(/\D/g, '');
const TIPOS = new Set(['Factura electrónica', 'Tiquete electrónico', 'Factura de exportación', 'Nota de débito']);

export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => null);
  const d = b?.doc;
  if (!d?.clave || !d?.consecutivo) return NextResponse.json({ error: 'El XML no trae clave ni consecutivo.' }, { status: 400 });
  if (!TIPOS.has(String(d.tipo))) return NextResponse.json({ error: `«${d.tipo}» no se puede importar para hacerle notas. Importa facturas, tiquetes o facturas de exportación.` }, { status: 400 });
  const db = await getDb();
  const { rows: em } = await db.execute('SELECT id, cedula_juridica FROM emisores');
  const emisor = em.find(e => dig(e.cedula_juridica) === dig(d.proveedorIdentificacion));
  if (!emisor) return NextResponse.json({ error: 'El emisor del XML no es tu empresa: solo se importan comprobantes que tú emitiste.' }, { status: 400 });
  const { rows: ya } = await db.execute({ sql: 'SELECT id FROM documentos_emitidos WHERE clave = ?', args: [String(d.clave)] });
  if (ya[0]) return NextResponse.json({ error: 'Ese comprobante ya está en el sistema.', id: ya[0].id }, { status: 409 });
  const { rows: cli } = await db.execute({ sql: `SELECT id FROM clientes WHERE REPLACE(REPLACE(COALESCE(numero_identificacion,''),'-',''),' ','') = ? LIMIT 1`, args: [dig(d.receptorIdentificacion)] });
  const id = '#' + String(Math.floor(30000 + Math.random() * 60000));
  await db.execute({
    sql: `INSERT INTO documentos_emitidos (id, tipo, numero_factura, clave, cliente_id, cliente_nombre, receptor_identificacion, emisor_id, fecha_emision,
            estado, condicion_venta, medios_pago, moneda, tipo_cambio, subtotal, iva, total, total_descuentos, total_otros_cargos, xml, origen, importado, actividad_receptor)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Aceptado', ?, '[]', ?, ?, ?, ?, ?, ?, ?, ?, 'Manual', 1, ?)`,
    args: [id, String(d.tipo), String(d.consecutivo), String(d.clave), cli[0]?.id ?? null, String(d.receptorNombre || 'Consumidor final'), dig(d.receptorIdentificacion) || null,
      String(emisor.id), String(d.fechaEmision), String(d.condicionVenta || '01'), String(d.moneda || 'CRC'), Number(d.tipoCambio || 1),
      Number(d.totalVentaNeta || 0), Number(d.totalImpuesto || 0), Number(d.totalComprobante || 0), Number(d.totalDescuentos || 0), Number(d.totalOtrosCargos || 0),
      typeof b.xml === 'string' ? b.xml : null, d.actividadReceptor || null],
  });
  const lineas = Array.isArray(d.lineas) ? d.lineas : [];
  for (const l of lineas) {
    await db.execute({
      sql: `INSERT INTO documentos_emitidos_lineas (id, documento_id, codigo_cabys, descripcion, cantidad, precio_unitario, impuesto, codigo_tarifa, descuento, unidad_medida)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: ['ln-' + Math.random().toString(36).slice(2), id, String(l.cabys || ''), String(l.detalle || ''), Number(l.cantidad || 1), Number(l.precioUnitario || 0),
        Number(l.tarifa || 0), Number(l.tarifa) === 13 ? '08' : Number(l.tarifa) === 4 ? '04' : Number(l.tarifa) === 2 ? '03' : Number(l.tarifa) === 1 ? '02' : Number(l.tarifa) === 0 ? '10' : '08',
        Number(l.descuento || 0), String(l.unidad || 'Unid')],
    });
  }
  const c = String(d.consecutivo);
  return NextResponse.json({ ok: true, id, sucursal: c.slice(0, 3), terminal: c.slice(3, 8) });
}
