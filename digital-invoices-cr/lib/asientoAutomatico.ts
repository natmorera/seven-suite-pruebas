import { contabilidadActiva } from '@/lib/modulos';
import { getDb } from './db';
import { cuentaDeTercero } from './tercerosServidor';


export interface MapeoContable {
  cuentaVentas: string;
  cuentaIvaVentas: string;
  cuentaCxc: string;
  cuentaCaja: string;
  cuentaBanco: string;
  cuentaGastos: string;
  cuentaIvaCompras: string;
  cuentaProveedores: string;
}

// Debe coincidir con la fila 'default' sembrada en lib/db.ts.
export const MAPEO_DEFAULT: MapeoContable = {
  cuentaVentas: '600-001-0001',
  cuentaIvaVentas: '300-002-0002',
  cuentaCxc: '110-001-0001',
  cuentaCaja: '100-001-0001',
  cuentaBanco: '100-002-0001',
  cuentaGastos: '800-001-0005',
  cuentaIvaCompras: '130-001-0004',
  cuentaProveedores: '300-001-0001',
};

export async function obtenerMapeo(db: Awaited<ReturnType<typeof getDb>>, emisorId: string): Promise<MapeoContable> {
  const res = await db.execute({
    sql: `SELECT * FROM mapeo_contable_facturacion WHERE emisor_id = ? UNION ALL
          SELECT * FROM mapeo_contable_facturacion WHERE emisor_id = 'default'`,
    args: [emisorId],
  });
  const row = res.rows[0] as Record<string, unknown> | undefined;
  if (!row) return MAPEO_DEFAULT;
  return {
    cuentaVentas: String(row.cuenta_ventas || MAPEO_DEFAULT.cuentaVentas),
    cuentaIvaVentas: String(row.cuenta_iva_ventas || MAPEO_DEFAULT.cuentaIvaVentas),
    cuentaCxc: String(row.cuenta_cxc || MAPEO_DEFAULT.cuentaCxc),
    cuentaCaja: String(row.cuenta_caja || MAPEO_DEFAULT.cuentaCaja),
    cuentaBanco: String(row.cuenta_banco || MAPEO_DEFAULT.cuentaBanco),
    cuentaGastos: String(row.cuenta_gastos || MAPEO_DEFAULT.cuentaGastos),
    cuentaIvaCompras: String(row.cuenta_iva_compras || MAPEO_DEFAULT.cuentaIvaCompras),
    cuentaProveedores: String(row.cuenta_proveedores || MAPEO_DEFAULT.cuentaProveedores),
  };
}

export async function crearAsientoPorCompra(compraId: string): Promise<ResultadoAsientoAutomatico> {
  const db = await getDb();
  // Solo facturación (sin Contabilidad): no hay asientos
  if (!(await contabilidadActiva(db))) return { creado: false };

  const existente = await db.execute({ sql: 'SELECT id, consecutivo FROM asientos WHERE documento_ref_id = ?', args: [compraId] });
  if (existente.rows.length > 0) {
    return { creado: false, yaExistia: true, asientoId: String(existente.rows[0].id), consecutivo: String(existente.rows[0].consecutivo) };
  }

  const compraRes = await db.execute({ sql: 'SELECT * FROM documentos_recibidos WHERE id = ?', args: [compraId] });
  const compra = compraRes.rows[0] as Record<string, unknown> | undefined;
  if (!compra) return { creado: false, error: 'Compra no encontrada' };

  const mapeo = await obtenerMapeo(db, 'default'); // las compras no tienen emisor propio en este modelo

  // Todo el asiento va en colones: una compra en dólares se convierte con
  // el tipo de cambio del comprobante.
  const tc = String(compra.moneda ?? 'CRC') === 'USD' ? Number(compra.tipo_cambio ?? 1) || 1 : 1;
  const r2 = (n: number) => Math.round(n * 100) / 100;
  const subtotal = Number(compra.subtotal ?? 0) * tc;
  const iva = Number(compra.iva ?? 0) * tc;
  const otros = Number(compra.total_otros_cargos ?? 0) * tc;
  const total = r2(Number(compra.total_factura ?? 0) * tc || (subtotal + iva + otros));
  const tipoCredito = String(compra.tipo_credito_fiscal ?? 'pleno');

  // Mismo criterio de referencia que usa el Reporte de IVA para el crédito
  // parcial (50%, mientras no exista el cálculo real de prorrata). El IVA
  // no acreditable no se pierde: se reparte en el gasto de cada línea.
  const proporcionAcreditable = tipoCredito === 'pleno' ? 1 : tipoCredito === 'parcial' ? 0.5 : 0;
  const ivaAcreditable = r2(iva * proporcionAcreditable);

  const numero = String(compra.numero_factura ?? compra.id ?? '');
  const proveedor = String(compra.proveedor ?? 'Proveedor');
  const ref = `Fact. ${numero}`;
  // Compra de contado: se paga en el acto (caja si fue en efectivo, si no bancos).
  // A crédito o sin condición: cuenta por pagar del proveedor.
  const deContado = String(compra.condicion_venta ?? '') === '01';
  const cuentaProveedor = deContado ? (String(compra.medio_pago ?? '') === '01' ? mapeo.cuentaCaja : mapeo.cuentaBanco) : String(compra.cuenta_proveedor || mapeo.cuentaProveedores);

  // Debe: una línea por cuenta elegida al importar (gasto, costo, inventario,
  // activo). Si la compra no trae líneas, todo va a la cuenta de gastos.
  let lineasCompra: { subtotal?: number; cuenta?: string; detalle?: string }[] = [];
  try { lineasCompra = compra.lineas_json ? JSON.parse(String(compra.lineas_json)) : []; } catch { lineasCompra = []; }
  const grupos = new Map<string, { base: number; detalles: string[] }>();
  for (const l of lineasCompra) {
    const cta = l.cuenta || mapeo.cuentaGastos;
    const g = grupos.get(cta) ?? { base: 0, detalles: [] };
    g.base += Math.max(0, Number(l.subtotal ?? 0));
    if (l.detalle && g.detalles.length < 2) g.detalles.push(l.detalle);
    grupos.set(cta, g);
  }
  const baseLineas = [...grupos.values()].reduce((a, g) => a + g.base, 0);
  if (!grupos.size || baseLineas <= 0) grupos.set(mapeo.cuentaGastos, { base: 1, detalles: [] });
  const baseTotal = [...grupos.values()].reduce((a, g) => a + g.base, 0);

  const aDistribuir = r2(total - ivaAcreditable - otros);
  const lineas: { cuenta: string; descripcion: string; debe: number; haber: number }[] = [];
  let acumulado = 0;
  const entradas = [...grupos.entries()].sort((a, b) => b[1].base - a[1].base);
  entradas.forEach(([cuenta, g], i) => {
    const monto = i === entradas.length - 1 ? r2(aDistribuir - acumulado) : r2(aDistribuir * g.base / baseTotal);
    acumulado = r2(acumulado + monto);
    const detalle = g.detalles.length ? ` · ${g.detalles.join(', ').slice(0, 60)}` : '';
    lineas.push({ cuenta, descripcion: `${ref} ${proveedor}${detalle}`, debe: monto, haber: 0 });
  });
  if (otros > 0) lineas.push({ cuenta: mapeo.cuentaGastos, descripcion: `${ref} ${proveedor} · otros cargos`, debe: r2(otros), haber: 0 });
  if (ivaAcreditable > 0) lineas.push({ cuenta: mapeo.cuentaIvaCompras, descripcion: `${ref} ${proveedor} · IVA acreditable`, debe: ivaAcreditable, haber: 0 });
  lineas.push({ cuenta: cuentaProveedor, descripcion: `${ref} ${proveedor} · ${deContado ? 'pago de contado' : 'cuenta por pagar'}`, debe: 0, haber: total });

  const countRes = await db.execute('SELECT COUNT(*) as n FROM asientos');
  const consecutivo = 'AUT' + String(Number(countRes.rows[0]?.n ?? 0) + 1).padStart(8, '0');
  const asientoId = 'as-' + Math.random().toString(36).slice(2);

  await db.execute({
    sql: `INSERT INTO asientos
      (id, tipo, origen, fecha, consecutivo, titulo, moneda, importe, usuario, documento, observacion, contabilizado, documento_ref_id, anulado)
      VALUES (?, 'A', 'Facturación electrónica', ?, ?, ?, 'CRC', ?, 'sistema', ?, ?, 0, ?, 0)`,
    args: [
      asientoId,
      new Date().toISOString().slice(0, 10),
      consecutivo,
      `Compra ${ref} · ${proveedor}`,
      total,
      numero,
      `Asiento generado al emitir el acuse de la factura de compra ${numero}${tc !== 1 ? ` (USD, TC ${tc})` : ''}.`,
      compraId,
    ],
  });

  for (const l of lineas) {
    await db.execute({
      sql: `INSERT INTO asientos_lineas (id, asiento_id, cuenta, descripcion, c_costos, debe, haber) VALUES (?, ?, ?, ?, '', ?, ?)`,
      args: ['al-' + Math.random().toString(36).slice(2), asientoId, l.cuenta, l.descripcion, l.debe, l.haber],
    });
  }

  return { creado: true, asientoId, consecutivo };
}

export interface ResultadoAsientoAutomatico {
  creado: boolean;
  yaExistia?: boolean;
  asientoId?: string;
  consecutivo?: string;
  error?: string;
}

export async function crearAsientoPorDocumento(documentoId: string): Promise<ResultadoAsientoAutomatico> {
  const db = await getDb();
  if (!(await contabilidadActiva(db))) return { creado: false };

  // Idempotencia: si este documento ya generó su asiento, no duplicar
  // (importante porque el endpoint de estado puede llamarse varias veces
  // mientras el documento sigue 'Procesando').
  const existente = await db.execute({ sql: 'SELECT id FROM asientos WHERE documento_ref_id = ?', args: [documentoId] });
  if (existente.rows.length > 0) {
    return { creado: false, yaExistia: true, asientoId: String(existente.rows[0].id) };
  }

  const docRes = await db.execute({ sql: 'SELECT * FROM documentos_emitidos WHERE id = ?', args: [documentoId] });
  const doc = docRes.rows[0] as Record<string, unknown> | undefined;
  if (!doc) return { creado: false, error: 'Documento no encontrado' };

  const mapeo = await obtenerMapeo(db, String(doc.emisor_id ?? ''));

  const tipoDoc = String(doc.tipo ?? '');
  const esNotaCredito = /nota de cr[eé]dito/i.test(tipoDoc);

  const subtotal = Number(doc.subtotal ?? 0);
  const iva = Number(doc.iva ?? 0);
  const total = Number(doc.total ?? 0);

  // A crédito: 02, y las de IVA al cobro (08 servicios al Estado, 10 crédito hasta 90 días)
  const esCredito = ['02', '08', '10'].includes(String(doc.condicion_venta ?? '01'));
  const esReciboPago = tipoDoc === 'Recibo Electrónico de Pago';
  let mediosPago: string[] = ['01'];
  try {
    const parsed = JSON.parse(String(doc.medios_pago ?? '["01"]'));
    if (Array.isArray(parsed) && parsed.length) mediosPago = parsed.map(String);
  } catch {
    // deja el default ['01'] Efectivo
  }
  const esEfectivo = mediosPago.includes('01') && !mediosPago.some(m => m !== '01');
  // A crédito: la cuenta auxiliar (nivel 4) del cliente si la tiene; si es
  // solo receptor, la cuenta general de clientes.
  const cuentaCliente = esCredito ? await cuentaDeTercero(db, doc.cliente_id ? String(doc.cliente_id) : null) : null;
  const cuentaCobro = esCredito ? (cuentaCliente ?? mapeo.cuentaCxc) : (esEfectivo ? mapeo.cuentaCaja : mapeo.cuentaBanco);

  // Ingresos por la cuenta de cada artículo; lo que no viene de un artículo
  // va a la cuenta de ventas por defecto. Artículos inventariables además
  // generan el costo de venta (costo / inventario).
  const { rows: lineasDoc } = await db.execute({
    sql: `SELECT l.cantidad, l.precio_unitario, l.descuento, l.descuento_json, l.otro_impuesto_json, f.cuenta_ingreso, f.cuenta_costo, f.cuenta_inventario, f.costo_unitario, f.inventariable, f.nombre
          FROM documentos_emitidos_lineas l LEFT JOIN cabys_favoritos f ON f.id = l.articulo_id WHERE l.documento_id = ?`,
    args: [documentoId],
  });
  const r2 = (n: number) => Math.round(n * 100) / 100;
  const ingresos = new Map<string, number>();
  let asignado = 0;
  const costos: { costo: string; inventario: string; monto: number; nombre: string }[] = [];
  // Descuentos con cuenta propia: el ingreso va bruto y el descuento se
  // registra aparte en su cuenta. Otros impuestos (además del IVA) van a su cuenta.
  const descuentosCta = new Map<string, number>();
  const otrosImpuestos = new Map<string, number>();
  const leer = (t: unknown) => { try { return t ? JSON.parse(String(t)) : null; } catch { return null; } };
  for (const l of lineasDoc) {
    const desc = Number(l.descuento ?? 0);
    const neto = r2(Number(l.cantidad ?? 0) * Number(l.precio_unitario ?? 0) - desc);
    const dj = leer(l.descuento_json) as { cuenta?: string } | null;
    const cuentaDesc = desc > 0 && dj?.cuenta ? String(dj.cuenta) : null;
    if (cuentaDesc) {
      descuentosCta.set(cuentaDesc, r2((descuentosCta.get(cuentaDesc) ?? 0) + desc));
      const ctaIngreso = l.cuenta_ingreso ? String(l.cuenta_ingreso) : mapeo.cuentaVentas;
      ingresos.set(ctaIngreso, r2((ingresos.get(ctaIngreso) ?? 0) + desc));
    }
    const oi = leer(l.otro_impuesto_json) as { cuenta?: string; monto?: number } | null;
    if (oi && Number(oi.monto) > 0) {
      const cta = oi.cuenta || mapeo.cuentaIvaVentas;
      otrosImpuestos.set(cta, r2((otrosImpuestos.get(cta) ?? 0) + r2(Number(oi.monto))));
    }
    if (l.cuenta_ingreso) { ingresos.set(String(l.cuenta_ingreso), r2((ingresos.get(String(l.cuenta_ingreso)) ?? 0) + neto)); asignado = r2(asignado + neto); }
    if (Number(l.inventariable) === 1 && l.cuenta_costo && l.cuenta_inventario && Number(l.costo_unitario) > 0) {
      costos.push({ costo: String(l.cuenta_costo), inventario: String(l.cuenta_inventario), monto: r2(Number(l.costo_unitario) * Number(l.cantidad ?? 0)), nombre: String(l.nombre ?? '') });
    }
  }
  const resto = r2(subtotal - asignado);
  if (Math.abs(resto) >= 0.01 || !ingresos.size) ingresos.set(mapeo.cuentaVentas, r2((ingresos.get(mapeo.cuentaVentas) ?? 0) + resto));
  const totalOtrosImp = r2([...otrosImpuestos.values()].reduce((a, b) => a + b, 0));
  const ivaSolo = r2(iva - totalOtrosImp);
  const otrosCargos = r2(total - subtotal - iva);

  type Linea = { cuenta: string; descripcion: string; debe: number; haber: number };
  const lineas: Linea[] = [];
  const refDoc = `${tipoDoc} ${String(doc.numero_factura ?? doc.id ?? '')}`.trim();

  if (esReciboPago) {
    // Recibo de pago: solo el cobro de la factura a crédito (caja o banco contra la cuenta del cliente)
    const cuentaClienteRecibo = (await cuentaDeTercero(db, doc.cliente_id ? String(doc.cliente_id) : null)) ?? mapeo.cuentaCxc;
    const cobrado = r2(total);
    const factura = String(doc.referencia_documento ?? '');
    lineas.push({ cuenta: esEfectivo ? mapeo.cuentaCaja : mapeo.cuentaBanco, descripcion: `Cobro ${refDoc}`, debe: cobrado, haber: 0 });
    lineas.push({ cuenta: cuentaClienteRecibo, descripcion: `Cobro ${refDoc}${factura ? ` · factura ${factura.length > 20 ? factura.slice(21, 41) : factura}` : ''}`, debe: 0, haber: cobrado });
  } else if (!esNotaCredito) {
    lineas.push({ cuenta: cuentaCobro, descripcion: `Cobro ${refDoc}`, debe: total, haber: 0 });
    for (const [cta, monto] of ingresos) if (monto) lineas.push({ cuenta: cta, descripcion: `Venta ${refDoc}`, debe: 0, haber: monto });
    for (const [cta, monto] of descuentosCta) lineas.push({ cuenta: cta, descripcion: `Descuento ${refDoc}`, debe: monto, haber: 0 });
    if (ivaSolo > 0) lineas.push({ cuenta: mapeo.cuentaIvaVentas, descripcion: `IVA débito fiscal ${refDoc}`, debe: 0, haber: ivaSolo });
    for (const [cta, monto] of otrosImpuestos) lineas.push({ cuenta: cta, descripcion: `Otros impuestos ${refDoc}`, debe: 0, haber: monto });
    if (Math.abs(otrosCargos) >= 0.01) lineas.push({ cuenta: mapeo.cuentaVentas, descripcion: `Otros cargos ${refDoc}`, debe: 0, haber: otrosCargos });
    for (const c of costos) {
      lineas.push({ cuenta: c.costo, descripcion: `Costo de venta ${c.nombre} ${refDoc}`, debe: c.monto, haber: 0 });
      lineas.push({ cuenta: c.inventario, descripcion: `Salida de inventario ${c.nombre} ${refDoc}`, debe: 0, haber: c.monto });
    }
  } else {
    // Nota de crédito: reversa la venta original (débito venta + IVA, crédito cobro).
    for (const [cta, monto] of ingresos) if (monto) lineas.push({ cuenta: cta, descripcion: `Anulación venta ${refDoc}`, debe: monto, haber: 0 });
    for (const [cta, monto] of descuentosCta) lineas.push({ cuenta: cta, descripcion: `Reverso descuento ${refDoc}`, debe: 0, haber: monto });
    if (ivaSolo > 0) lineas.push({ cuenta: mapeo.cuentaIvaVentas, descripcion: `Reverso IVA débito fiscal ${refDoc}`, debe: ivaSolo, haber: 0 });
    for (const [cta, monto] of otrosImpuestos) lineas.push({ cuenta: cta, descripcion: `Reverso otros impuestos ${refDoc}`, debe: monto, haber: 0 });
    if (Math.abs(otrosCargos) >= 0.01) lineas.push({ cuenta: mapeo.cuentaVentas, descripcion: `Reverso otros cargos ${refDoc}`, debe: otrosCargos, haber: 0 });
    for (const c of costos) {
      lineas.push({ cuenta: c.inventario, descripcion: `Devolución a inventario ${c.nombre} ${refDoc}`, debe: c.monto, haber: 0 });
      lineas.push({ cuenta: c.costo, descripcion: `Reverso costo de venta ${c.nombre} ${refDoc}`, debe: 0, haber: c.monto });
    }
    lineas.push({ cuenta: cuentaCobro, descripcion: `Reverso cobro ${refDoc}`, debe: 0, haber: total });
  }

  const countRes = await db.execute('SELECT COUNT(*) as n FROM asientos');
  const consecutivo = 'AUT' + String(Number(countRes.rows[0]?.n ?? 0) + 1).padStart(8, '0');
  const asientoId = 'as-' + Math.random().toString(36).slice(2);

  await db.execute({
    sql: `INSERT INTO asientos
      (id, tipo, origen, fecha, consecutivo, titulo, moneda, importe, usuario, documento, observacion, contabilizado, documento_ref_id, anulado)
      VALUES (?, 'A', 'Facturación electrónica', ?, ?, ?, ?, ?, 'sistema', ?, ?, 0, ?, 0)`,
    args: [
      asientoId,
      new Date().toISOString().slice(0, 10),
      consecutivo,
      `${refDoc} · ${String(doc.cliente_nombre ?? 'Consumidor final')}`,
      String(doc.moneda ?? 'CRC'),
      total,
      String(doc.numero_factura ?? doc.id ?? ''),
      'Asiento generado automáticamente al aceptar el comprobante ante Hacienda.',
      documentoId,
    ],
  });

  for (const l of lineas) {
    await db.execute({
      sql: `INSERT INTO asientos_lineas (id, asiento_id, cuenta, descripcion, c_costos, debe, haber) VALUES (?, ?, ?, ?, '', ?, ?)`,
      args: ['al-' + Math.random().toString(36).slice(2), asientoId, l.cuenta, l.descripcion, l.debe, l.haber],
    });
  }

  return { creado: true, asientoId, consecutivo };
}
