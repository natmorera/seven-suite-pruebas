// Guardar una compra recibida (desde XML, correo o importación automática)
// y aprender su clasificación. Lo usan /api/recepcion y la importación
// automática del buzón (lib/comprasAuto.ts).
import type { Client } from '@libsql/client';
import { crearAsientoPorCompra } from '@/lib/asientoAutomatico';
import { aplicarInventarioCompra } from '@/lib/inventario';
import { asegurarProveedor, registrarActividadProveedor, miActividadPorDefecto } from '@/lib/tercerosServidor';
import { claveMapeo, soloDigitos } from '@/lib/cuentasContables';

const r2 = (n: number) => Math.round(n * 100) / 100;
function nuevoId() { return '00000100004' + Math.floor(1000 + Math.random() * 8999) + Math.floor(Math.random() * 10); }

/* eslint-disable @typescript-eslint/no-explicit-any */
// Guarda la clasificación elegida para que la próxima compra del mismo
// proveedor llegue sugerida: una fila por línea (código o detalle) y una
// fila '*' con la cuenta del proveedor.
export async function aprender(db: Client, d: any) {
  const ahora = new Date().toISOString();
  const ced = String(d.proveedorIdentificacion ?? '');
  const filas: [string, string, string | null][] = [];
  if (d.cuentaProveedor) filas.push([claveMapeo(ced, '*', d.proveedor ?? ''), d.cuentaProveedor, null]);
  for (const l of (Array.isArray(d.lineas) ? d.lineas : [])) {
    if (!l.cuenta) continue;
    filas.push([claveMapeo(ced, l.codigo || l.cabys || '', l.detalle ?? ''), l.cuenta, l.articuloId ?? null]);
  }
  for (const [clave, cuenta, art] of filas) {
    await db.execute({
      sql: `INSERT INTO compras_mapeo (clave, proveedor_identificacion, codigo, cuenta, articulo_id, actualizado) VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(clave) DO UPDATE SET cuenta = excluded.cuenta, articulo_id = excluded.articulo_id, actualizado = excluded.actualizado`,
      args: [clave, soloDigitos(ced) ? ced : '', clave.split('|')[1] ?? '', cuenta, art, ahora],
    });
  }
}

export interface ResultadoCompra { clave: string; consecutivo: string; ok: boolean; id?: string; error?: string; asiento?: string | null }

// d: lo leído del XML + la clasificación (ver ImportarComprasModal).
export async function guardarCompra(db: Client, d: any): Promise<ResultadoCompra> {
  const clave = String(d.clave ?? '');
  const consecutivo = String(d.consecutivo ?? '');
  // Duplicado: misma clave, o mismo consecutivo del mismo proveedor
  const dup = await db.execute({
    sql: `SELECT id FROM documentos_recibidos
          WHERE (clave <> '' AND clave = ?) OR (numero_factura = ? AND COALESCE(proveedor_identificacion,'') = ?)`,
    args: [clave, consecutivo, String(d.proveedorIdentificacion ?? '')],
  });
  if (dup.rows.length) return { clave, consecutivo, ok: false, error: 'Ya estaba importado' };

  const id = nuevoId();
  const acusar = Boolean(d.emitirAcuse);
  // Toda compra queda con MI actividad (hotel) desde que entra: la elegida al
  // importar o, si no vino, la asociada al proveedor / mi principal. El acuse la usa tal cual.
  if (!d.actividadEconomica) d = { ...d, actividadEconomica: await miActividadPorDefecto(db, d.proveedorIdentificacion) };
  await db.execute({
    sql: `INSERT INTO documentos_recibidos
      (id, proveedor, numero_factura, fecha_emision, fecha_aceptacion, estado, total_factura, subtotal, iva, tarifa,
       tipo_credito_fiscal, origen, clave, tipo, proveedor_identificacion, proveedor_correo, receptor_identificacion,
       moneda, tipo_cambio, total_exento, total_descuentos, total_otros_cargos, actividad_economica, lineas_json, xml,
       correo_id, tipo_acuse, cuenta_proveedor, cuenta_proveedor_nombre, condicion_venta, medio_pago, actividad_proveedor)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id, d.proveedor ?? '(sin nombre)', consecutivo, d.fechaEmision ?? new Date().toISOString(),
      acusar ? new Date().toISOString() : null, acusar ? 'Aceptado' : 'Recibido',
      r2(Number(d.total ?? 0)), r2(Number(d.subtotal ?? 0)), r2(Number(d.iva ?? 0)), Number(d.tarifa ?? 13),
      d.tipoCreditoFiscal ?? 'pleno', d.origen ?? 'xml', clave, d.tipo ?? 'Factura electrónica',
      d.proveedorIdentificacion ?? null, d.proveedorCorreo ?? null, d.receptorIdentificacion ?? null,
      d.moneda ?? 'CRC', Number(d.tipoCambio ?? 1), r2(Number(d.totalExento ?? 0)), r2(Number(d.totalDescuentos ?? 0)),
      r2(Number(d.totalOtrosCargos ?? 0)), d.actividadEconomica ?? null,
      d.lineas ? JSON.stringify(d.lineas) : null, d.xml ?? null, d.correoId ?? null, acusar ? 'total' : null,
      d.cuentaProveedor ?? null, d.cuentaProveedorNombre ?? null,
      d.condicionVenta ?? null, Array.isArray(d.medioPago) ? d.medioPago[0] ?? null : d.medioPago ?? null,
      d.actividadEmisor ?? null,
    ],
  });
  // Guatemala: tipo de DTE (el de la compra física o el que trae el XML de FEL)
  const tipoDte = d.tipoDte ?? /DatosGenerales[^>]*\bTipo="(\w+)"/.exec(String(d.xml ?? ''))?.[1] ?? null;
  if (tipoDte) await db.execute({ sql: 'UPDATE documentos_recibidos SET tipo_dte = ? WHERE id = ?', args: [tipoDte, id] }).catch(() => null);
  if (d.correoId) await db.execute({ sql: 'UPDATE correos SET importado = 1 WHERE id = ?', args: [d.correoId] });
  // Proveedor nuevo → se crea con su cuenta auxiliar (nivel 4)
  if (d.crearProveedor && d.cuentaProveedor) {
    await asegurarProveedor(db, { nombre: d.proveedor, identificacion: d.proveedorIdentificacion, correo: d.proveedorCorreo, cuentaCode: d.cuentaProveedor });
  }
  // La actividad con que facturó el proveedor (del XML) queda en su perfil si no la tenía.
  // Es la de ÉL; la de la empresa (hotel) es d.actividadEconomica, elegida al importar.
  if (d.actividadEmisor) {
    const completa = await registrarActividadProveedor(db, d.proveedorIdentificacion, d.actividadEmisor);
    if (completa) await db.execute({ sql: 'UPDATE documentos_recibidos SET actividad_proveedor = ? WHERE id = ?', args: [completa, id] });
  }
  // ¿Las próximas de este proveedor llegan solas? (casilla del importador)
  if (typeof d.comprasAuto === 'boolean' && soloDigitos(d.proveedorIdentificacion)) {
    const { rows } = await db.execute(`SELECT id, numero_identificacion FROM clientes WHERE tipo = 'proveedor'`);
    const hit = rows.find(r => soloDigitos(String(r.numero_identificacion ?? '')) === soloDigitos(d.proveedorIdentificacion));
    if (hit) await db.execute({ sql: 'UPDATE clientes SET compras_auto = ? WHERE id = ?', args: [d.comprasAuto ? 1 : 0, String(hit.id)] });
  }
  await aprender(db, d);
  let asiento: string | null = null;
  if (acusar && d.generarAsiento !== false) {
    const a = await crearAsientoPorCompra(id);
    asiento = a.consecutivo ?? null;
  }
  if (acusar) await aplicarInventarioCompra(db, id);
  return { clave, consecutivo, ok: true, id, asiento };
}
/* eslint-enable @typescript-eslint/no-explicit-any */
