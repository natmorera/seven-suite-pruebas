// Existencias: las ventas de artículos inventariables las rebajan (una nota
// de crédito las devuelve) y las compras aceptadas las suben. Cada cambio
// queda en inventario_movimientos. `cantidad_inicial` del artículo guarda
// las existencias actuales.
import type { Client } from '@libsql/client';

async function mover(db: Client, articuloId: string, cantidad: number, tipo: string, documento: string, refId: string, costo = 0) {
  const { rows } = await db.execute({ sql: 'SELECT inventariable FROM cabys_favoritos WHERE id = ?', args: [articuloId] });
  if (!rows[0] || Number(rows[0].inventariable) !== 1 || !cantidad) return;
  await db.execute({ sql: 'UPDATE cabys_favoritos SET cantidad_inicial = COALESCE(cantidad_inicial, 0) + ? WHERE id = ?', args: [cantidad, articuloId] });
  if (costo > 0 && cantidad > 0) await db.execute({ sql: 'UPDATE cabys_favoritos SET costo_unitario = ? WHERE id = ?', args: [costo, articuloId] });
  await db.execute({
    sql: `INSERT INTO inventario_movimientos (id, articulo_id, fecha, tipo, cantidad, costo_unitario, documento, documento_ref_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    args: ['mov-' + Math.random().toString(36).slice(2), articuloId, new Date().toISOString(), tipo, cantidad, costo, documento, refId],
  });
}

export async function aplicarInventarioVenta(db: Client, documentoId: string) {
  const { rows } = await db.execute({ sql: 'SELECT tipo, numero_factura, inventario_aplicado, es_borrador FROM documentos_emitidos WHERE id = ?', args: [documentoId] });
  const d = rows[0];
  if (!d || Number(d.inventario_aplicado) === 1 || Number(d.es_borrador) === 1) return;
  const signo = String(d.tipo) === 'Nota de crédito' ? 1 : String(d.tipo) === 'Nota de débito' ? 0 : -1;
  if (signo !== 0) {
    const { rows: lineas } = await db.execute({ sql: 'SELECT articulo_id, cantidad FROM documentos_emitidos_lineas WHERE documento_id = ? AND articulo_id IS NOT NULL', args: [documentoId] });
    for (const l of lineas) await mover(db, String(l.articulo_id), signo * Number(l.cantidad ?? 0), signo < 0 ? 'venta' : 'devolución', `${d.tipo} ${d.numero_factura}`, documentoId);
  }
  await db.execute({ sql: 'UPDATE documentos_emitidos SET inventario_aplicado = 1 WHERE id = ?', args: [documentoId] });
}

export async function aplicarInventarioCompra(db: Client, compraId: string) {
  const { rows } = await db.execute({ sql: 'SELECT numero_factura, lineas_json, inventario_aplicado, estado, moneda, tipo_cambio FROM documentos_recibidos WHERE id = ?', args: [compraId] });
  const c = rows[0];
  if (!c || Number(c.inventario_aplicado) === 1 || c.estado !== 'Aceptado') return;
  let lineas: { articuloId?: string; cantidad?: number; subtotal?: number }[] = [];
  try { lineas = c.lineas_json ? JSON.parse(String(c.lineas_json)) : []; } catch { lineas = []; }
  const tc = String(c.moneda) === 'USD' ? Number(c.tipo_cambio) || 1 : 1;
  for (const l of lineas) {
    if (!l.articuloId) continue;
    const cant = Number(l.cantidad ?? 1) || 1;
    await mover(db, l.articuloId, cant, 'compra', `Compra ${c.numero_factura}`, compraId, Math.round(Number(l.subtotal ?? 0) * tc / cant * 100) / 100);
  }
  await db.execute({ sql: 'UPDATE documentos_recibidos SET inventario_aplicado = 1 WHERE id = ?', args: [compraId] });
}
