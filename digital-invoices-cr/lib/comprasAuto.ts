// Importación automática de compras que llegan al buzón.
//
// Regla: la PRIMERA factura de un proveedor se importa a mano desde la
// bandeja (ahí se le asigna la cuenta del proveedor y las cuentas de gasto).
// Desde entonces, las siguientes de ese proveedor se importan solas y quedan
// en Recibidos, listas para emitir el acuse. Cada proveedor lo puede apagar
// (Clientes y proveedores › Compras por correo › Importar automáticamente).
//
// Un correo se queda en la bandeja para revisarlo a mano cuando:
//   · el proveedor no existe o nunca se le ha importado nada,
//   · el proveedor tiene la importación automática apagada,
//   · el comprobante no viene a nombre de la empresa,
//   · el XML no se puede leer o ya estaba importado.
import type { Client } from '@libsql/client';
import { DOMParser as XmlDomParser } from '@xmldom/xmldom';
import { parsearCompraXml } from '@/lib/xmlCompra';
import { claveMapeo, soloDigitos, sugerirCuentaLinea } from '@/lib/cuentasContables';
import { guardarCompra } from '@/lib/comprasGuardar';

function correoDe(remitente: string): string {
  return (remitente.match(/<([^>]+)>/)?.[1] ?? remitente).trim().toLowerCase();
}

interface ProveedorAuto { id: string; nombre: string; cuenta: string; cuentaGasto: string | null }

// Proveedor al que se le pueden importar las facturas solas (o null).
async function proveedorAutomatico(db: Client, cedula: string, remitente: string): Promise<ProveedorAuto | null> {
  const ced = soloDigitos(cedula);
  const correo = correoDe(remitente);
  const { rows } = await db.execute(`SELECT id, nombre, numero_identificacion, email, datos_json, compras_auto, cuenta_gasto, correos_compra
    FROM clientes WHERE tipo = 'proveedor' AND COALESCE(con_cuenta, 1) = 1`);
  const p = rows.find(r => ced && soloDigitos(String(r.numero_identificacion ?? '')) === ced)
    ?? rows.find(r => correo && String(r.correos_compra ?? '').toLowerCase().split(/[\s,;]+/).includes(correo));
  if (!p || Number(p.compras_auto ?? 1) === 0) return null;
  const cedP = soloDigitos(String(p.numero_identificacion ?? ''));

  // Cuenta del proveedor: la aprendida al importar, o la de su perfil.
  const { rows: m } = await db.execute({ sql: 'SELECT cuenta FROM compras_mapeo WHERE clave = ?', args: [claveMapeo(cedP, '*', String(p.nombre ?? ''))] });
  let cuenta = m[0]?.cuenta ? String(m[0].cuenta) : '';
  if (!cuenta) {
    try { const perfil = JSON.parse(String(p.datos_json ?? '{}')); if (perfil.cuentaCode && perfil.auxId) cuenta = `${perfil.cuentaCode}-${perfil.auxId}`; } catch { /* sin perfil */ }
  }
  if (!cuenta) return null;
  const { rows: previas } = await db.execute({ sql: `SELECT 1 FROM documentos_recibidos WHERE REPLACE(REPLACE(COALESCE(proveedor_identificacion,''),'-',''),' ','') = ? LIMIT 1`, args: [cedP] });
  const conocido = Number(p.compras_auto ?? 0) === 1 || previas.length > 0 || m.length > 0 || Boolean(p.cuenta_gasto);
  if (!conocido) return null;
  return { id: String(p.id), nombre: String(p.nombre), cuenta, cuentaGasto: p.cuenta_gasto ? String(p.cuenta_gasto) : null };
}

export type ResultadoAuto = { importado: true; consecutivo: string; proveedor: string } | { importado: false; motivo: string };

// Intenta importar el comprobante de un correo de la bandeja.
export async function autoImportarCorreo(db: Client, correoId: string): Promise<ResultadoAuto> {
  const { rows } = await db.execute({ sql: 'SELECT id, remitente, xml, importado FROM correos WHERE id = ?', args: [correoId] });
  const c = rows[0];
  if (!c || !c.xml) return { importado: false, motivo: 'Sin XML' };
  if (Number(c.importado ?? 0) === 1) return { importado: false, motivo: 'Ya importado' };
  const r = parsearCompraXml(String(c.xml), new XmlDomParser({ errorHandler: { warning: () => {}, error: () => {}, fatalError: () => {} } }));
  if (!r.ok) return { importado: false, motivo: r.error };
  const d = r.doc;

  // Debe venir a nombre de la empresa (alguno de sus emisores)
  const { rows: emis } = await db.execute('SELECT cedula_juridica, actividad_economica FROM emisores');
  const propias = new Set(emis.map(e => soloDigitos(String(e.cedula_juridica ?? ''))));
  if (d.receptorIdentificacion && propias.size && !propias.has(soloDigitos(d.receptorIdentificacion))) {
    return { importado: false, motivo: 'No viene a nombre de la empresa' };
  }
  const prov = await proveedorAutomatico(db, d.proveedorIdentificacion, String(c.remitente ?? ''));
  if (!prov) return { importado: false, motivo: 'Proveedor nuevo o sin importación automática' };

  const ced = d.proveedorIdentificacion;
  const cedDig = soloDigitos(ced);
  // Última compra del proveedor: de ahí se toman crédito fiscal y actividad
  const { rows: ult } = await db.execute({
    sql: `SELECT tipo_credito_fiscal, actividad_economica FROM documentos_recibidos
          WHERE REPLACE(REPLACE(COALESCE(proveedor_identificacion,''),'-',''),' ','') = ? ORDER BY fecha_emision DESC LIMIT 1`, args: [cedDig],
  });
  const { rows: ultimaLinea } = await db.execute({
    sql: `SELECT cuenta FROM compras_mapeo WHERE clave LIKE ? AND clave NOT LIKE ? ORDER BY actualizado DESC LIMIT 1`, args: [`${cedDig}|%`, `${cedDig}|*`],
  });
  const lineas = [];
  const creditosLinea: string[] = [];   // IVA acreditable configurado por artículo
  for (const l of d.lineas) {
    const { rows: ap } = await db.execute({ sql: 'SELECT cuenta, articulo_id, credito_fiscal FROM compras_mapeo WHERE clave = ?', args: [claveMapeo(ced, l.codigo || l.cabys || '', l.detalle)] });
    if (ap[0]?.credito_fiscal) creditosLinea.push(String(ap[0].credito_fiscal));
    const cuenta = ap[0]?.cuenta ? String(ap[0].cuenta)
      : prov.cuentaGasto ?? (ultimaLinea[0]?.cuenta ? String(ultimaLinea[0].cuenta) : sugerirCuentaLinea(l.detalle).cuenta);
    lineas.push({ ...l, cuenta, articuloId: ap[0]?.articulo_id ? String(ap[0].articulo_id) : undefined });
  }
  // Si algún artículo está configurado con crédito parcial o sin derecho, manda ese
  const creditoArticulos = creditosLinea.includes('sin_derecho') ? 'sin_derecho' : creditosLinea.includes('parcial') ? 'parcial' : creditosLinea.length ? 'pleno' : null;
  const credito = d.tipo === 'Tiquete electrónico' ? 'sin_derecho' : creditoArticulos ?? String(ult[0]?.tipo_credito_fiscal ?? 'pleno');
  // La actividad con el mismo formato que el importador («código - nombre»)
  const actEmisor = emis.map(e => String(e.actividad_economica ?? '')).find(a => d.actividadReceptor && a.startsWith(d.actividadReceptor)) ?? String(emis[0]?.actividad_economica ?? '');
  // Primero la actividad que el proveedor tiene asociada en su perfil; si no, la de su última compra
  const { rows: provAct } = await db.execute({ sql: `SELECT actividad_empresa FROM clientes WHERE REPLACE(REPLACE(COALESCE(numero_identificacion,''),'-',''),' ','') = ? AND COALESCE(actividad_empresa,'') <> '' LIMIT 1`, args: [soloDigitos(String(ced ?? ''))] });
  const actividad = provAct[0]?.actividad_empresa ? String(provAct[0].actividad_empresa) : ult[0]?.actividad_economica ? String(ult[0].actividad_economica) : (actEmisor || d.actividadReceptor);

  const res = await guardarCompra(db, {
    clave: d.clave, tipo: d.tipo, consecutivo: d.consecutivo, fechaEmision: d.fechaEmision,
    proveedor: d.proveedor, proveedorIdentificacion: d.proveedorIdentificacion, proveedorCorreo: d.proveedorCorreo,
    receptorIdentificacion: d.receptorIdentificacion, moneda: d.moneda, tipoCambio: d.tipoCambio,
    subtotal: d.totalVentaNeta || (d.totalGravado + d.totalExento - d.totalDescuentos), iva: d.totalImpuesto,
    total: d.totalComprobante, totalExento: d.totalExento, totalDescuentos: d.totalDescuentos,
    totalOtrosCargos: d.totalOtrosCargos, tarifa: d.tarifaPrincipal, lineas, xml: r.xml,
    tipoCreditoFiscal: credito, actividadEconomica: actividad, actividadEmisor: d.actividadEmisor, origen: 'auto', correoId,
    emitirAcuse: false, cuentaProveedor: prov.cuenta, cuentaProveedorNombre: prov.nombre,
  });
  if (!res.ok) {
    // Ya estaba importado (p. ej. por XML): se marca el correo para que no estorbe
    if (res.error === 'Ya estaba importado') await db.execute({ sql: 'UPDATE correos SET importado = 1 WHERE id = ?', args: [correoId] });
    return { importado: false, motivo: res.error ?? 'No se pudo importar' };
  }
  await db.execute({ sql: 'UPDATE correos SET auto_importado = 1 WHERE id = ?', args: [correoId] });
  return { importado: true, consecutivo: d.consecutivo, proveedor: d.proveedor };
}

// Revisa toda la bandeja (correos con XML aún no importados).
export async function autoImportarPendientes(db: Client): Promise<number> {
  const { rows } = await db.execute(`SELECT id FROM correos WHERE COALESCE(importado, 0) = 0 AND xml IS NOT NULL AND xml <> ''`);
  let n = 0;
  for (const r of rows) {
    const res = await autoImportarCorreo(db, String(r.id)).catch(() => ({ importado: false } as ResultadoAuto));
    if (res.importado) n++;
  }
  return n;
}
