// Factura electrónica de compra (08). La emite la empresa cuando le compra a
// alguien que no factura electrónicamente (productor, persona física no
// inscrita, proveedor del exterior). Cuando Hacienda la acepta, queda
// registrada como compra: con su asiento, su crédito de IVA y sus existencias.
import type { Client } from '@libsql/client';
import { guardarCompra } from '@/lib/comprasGuardar';

export const TIPO_FEC = 'Factura electrónica de compra';

export async function registrarCompraDeFec(db: Client, documentoId: string): Promise<{ compraId?: string; asiento?: string | null; error?: string }> {
  const { rows } = await db.execute({ sql: 'SELECT * FROM documentos_emitidos WHERE id = ?', args: [documentoId] });
  const d = rows[0];
  if (!d) return { error: 'No se encontró el documento.' };
  if (d.compra_id) return { compraId: String(d.compra_id) };
  const { rows: lineas } = await db.execute({ sql: 'SELECT * FROM documentos_emitidos_lineas WHERE documento_id = ?', args: [documentoId] });
  const cuenta = d.compra_cuenta_gasto ? String(d.compra_cuenta_gasto) : undefined;
  const { rows: em } = await db.execute({ sql: 'SELECT cedula_juridica FROM emisores WHERE id = ?', args: [String(d.emisor_id ?? '')] });
  const r = await guardarCompra(db, {
    proveedor: d.cliente_nombre, proveedorIdentificacion: d.receptor_identificacion ?? null, proveedorCorreo: d.receptor_email ?? null,
    receptorIdentificacion: em[0]?.cedula_juridica ?? null,
    clave: d.clave, consecutivo: d.numero_factura, fechaEmision: d.fecha_emision, tipo: TIPO_FEC, origen: 'fec',
    moneda: d.moneda ?? 'CRC', tipoCambio: Number(d.tipo_cambio ?? 1),
    subtotal: Number(d.subtotal ?? 0), iva: Number(d.iva ?? 0), total: Number(d.total ?? 0),
    totalDescuentos: Number(d.total_descuentos ?? 0), totalOtrosCargos: Number(d.total_otros_cargos ?? 0),
    tipoCreditoFiscal: d.compra_credito_fiscal ?? 'pleno', xml: d.xml ?? null,
    condicionVenta: d.condicion_venta ?? null, medioPago: (() => { try { return JSON.parse(String(d.medios_pago ?? '[]')); } catch { return []; } })(),
    lineas: lineas.map(l => {
      const sub = Number(l.cantidad) * Number(l.precio_unitario) - Number(l.descuento ?? 0);
      return { detalle: l.descripcion, cantidad: Number(l.cantidad), precioUnitario: Number(l.precio_unitario), subtotal: sub, tarifa: Number(l.impuesto ?? 0),
        codigo: l.codigo_comercial || l.codigo_cabys, cabys: l.codigo_cabys, cuenta, articuloId: l.articulo_id ?? null };
    }),
    // Aceptada por Hacienda: no lleva acuse (la emitió la propia empresa)
    emitirAcuse: true, generarAsiento: true,
  });
  if (!r.ok || !r.id) return { error: r.error ?? 'No se pudo registrar la compra.' };
  await db.execute({ sql: 'UPDATE documentos_recibidos SET documento_emitido_id = ?, tipo_acuse = NULL WHERE id = ?', args: [documentoId, r.id] });
  await db.execute({ sql: 'UPDATE documentos_emitidos SET compra_id = ? WHERE id = ?', args: [r.id, documentoId] });
  return { compraId: r.id, asiento: r.asiento };
}
