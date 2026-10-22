import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { leerCatalogo } from '@/lib/catalogoCuentas';
import type { Cuenta } from '@/components/pages/catalogo/catalogoData';
import { leerCuentasTerceros } from '@/lib/tercerosServidor';
import { configurarCuentasTerceros, codigoAuxiliar } from '@/lib/cuentasContables';
import { conPaisDeSolicitud } from '@/lib/paisServidor';

// Vínculo entre un documento de facturación y su asiento (Accounting + Digital Invoices):
//   ?documento=<id>  → el asiento que generó la venta o compra, con sus líneas y nombres de cuenta
//   ?asiento=<num>   → el documento de origen de un asiento (para la Bandeja)
const aplanar = (ns: Cuenta[]): Cuenta[] => ns.flatMap(c => [c, ...aplanar(c.children ?? [])]);

async function manejarGET(req: NextRequest) {
  const db = await getDb();
  const documento = req.nextUrl.searchParams.get('documento');
  const num = req.nextUrl.searchParams.get('asiento');

  if (documento) {
    const { rows } = await db.execute({ sql: 'SELECT rowid AS num, * FROM asientos WHERE documento_ref_id = ? AND COALESCE(anulado, 0) = 0 ORDER BY rowid LIMIT 1', args: [documento] });
    const a = rows[0];
    if (!a) return NextResponse.json({ asiento: null });
    const { rows: ls } = await db.execute({ sql: 'SELECT cuenta, descripcion, debe, haber FROM asientos_lineas WHERE asiento_id = ? ORDER BY rowid', args: [String(a.id)] });
    const nombres = new Map(aplanar(await leerCatalogo(db)).map(c => [c.code, c.nombre]));
    // Las cuentas auxiliares de clientes y proveedores viven en su ficha de tercero
    configurarCuentasTerceros(await leerCuentasTerceros(db));
    const { rows: ters } = await db.execute("SELECT nombre, datos_json FROM clientes WHERE COALESCE(con_cuenta, 1) = 1 AND COALESCE(datos_json, '') <> ''");
    for (const t of ters) {
      try { const p = JSON.parse(String(t.datos_json)); if (p.cuentaCode && p.auxId) nombres.set(codigoAuxiliar(p.cuentaCode, p.auxId), String(t.nombre ?? '')); } catch { /* sin perfil */ }
    }
    return NextResponse.json({ asiento: {
      num: Number(a.num), consecutivo: String(a.consecutivo ?? ''), fecha: String(a.fecha ?? ''), titulo: String(a.titulo ?? ''), moneda: String(a.moneda ?? 'CRC'),
      contabilizado: Number(a.contabilizado) === 1, anulado: Number(a.anulado) === 1,
      lineas: ls.map(l => ({ cuenta: String(l.cuenta ?? ''), nombreCuenta: nombres.get(String(l.cuenta ?? '')) ?? null, descripcion: String(l.descripcion ?? ''), debe: Number(l.debe ?? 0), haber: Number(l.haber ?? 0) })),
    } });
  }

  if (num) {
    const { rows } = await db.execute({ sql: 'SELECT documento_ref_id FROM asientos WHERE rowid = ?', args: [Number(num)] });
    const ref = rows[0]?.documento_ref_id ? String(rows[0].documento_ref_id) : '';
    if (!ref) return NextResponse.json({ documento: null });
    const { rows: ve } = await db.execute({ sql: 'SELECT id, tipo, numero_factura, cliente_nombre, fecha_emision, total, moneda, estado FROM documentos_emitidos WHERE id = ?', args: [ref] });
    if (ve[0]) {
      const d = ve[0];
      return NextResponse.json({ documento: { clase: 'venta', id: String(d.id), tipo: String(d.tipo ?? ''), numero: String(d.numero_factura ?? ''), tercero: String(d.cliente_nombre ?? ''),
        fecha: String(d.fecha_emision ?? ''), total: Number(d.total ?? 0), moneda: String(d.moneda ?? 'CRC'), estado: String(d.estado ?? ''),
        url: `/facturacion/emitidos/${String(d.id).replace('#', '')}` } });
    }
    const { rows: co } = await db.execute({ sql: 'SELECT id, tipo, numero_factura, proveedor, fecha_emision, total_factura, moneda, estado FROM documentos_recibidos WHERE id = ?', args: [ref] });
    if (co[0]) {
      const d = co[0];
      return NextResponse.json({ documento: { clase: 'compra', id: String(d.id), tipo: String(d.tipo || 'Factura del proveedor'), numero: String(d.numero_factura ?? ''), tercero: String(d.proveedor ?? ''),
        fecha: String(d.fecha_emision ?? ''), total: Number(d.total_factura ?? 0), moneda: String(d.moneda ?? 'CRC'), estado: String(d.estado ?? ''),
        url: `/facturacion/recepcion/${encodeURIComponent(String(d.id))}` } });
    }
    return NextResponse.json({ documento: null });
  }
  return NextResponse.json({ error: 'Indica el documento o el asiento.' }, { status: 400 });
}

// Cada solicitud corre con el país de la empresa elegida
export const GET = conPaisDeSolicitud(manejarGET);
