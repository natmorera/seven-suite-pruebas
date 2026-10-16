import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { claveMapeo } from '@/lib/cuentasContables';

// Artículos que compra cada proveedor (lo aprendido al clasificar compras):
// clave (cédula|código) → cuenta, IVA acreditable, destino y artículo.
//   GET                    → todo (para el importador)
//   GET ?proveedor=<cédula> → los del proveedor, más las líneas de sus
//                            compras que todavía no tienen configuración
//   PUT { proveedor, codigo, descripcion, cuenta, credito, destino, articuloId }
const dig = (s: unknown) => String(s ?? '').replace(/\D/g, '');

export async function GET(req: NextRequest) {
  const db = await getDb();
  const ced = dig(req.nextUrl.searchParams.get('proveedor'));
  if (!ced) {
    const { rows } = await db.execute('SELECT clave, cuenta, articulo_id, credito_fiscal, destino FROM compras_mapeo');
    return NextResponse.json(rows);
  }
  const { rows: guardados } = await db.execute({ sql: `SELECT * FROM compras_mapeo WHERE clave LIKE ? AND clave NOT LIKE ? ORDER BY actualizado DESC`, args: [`${ced}|%`, `${ced}|*`] });
  const porClave = new Map(guardados.map(g => [String(g.clave), g]));
  // Líneas de sus compras: lo que el proveedor factura de verdad
  const { rows: compras } = await db.execute({
    sql: `SELECT lineas_json, fecha_emision FROM documentos_recibidos WHERE REPLACE(REPLACE(COALESCE(proveedor_identificacion,''),'-',''),' ','') = ? ORDER BY fecha_emision DESC LIMIT 60`, args: [ced],
  });
  const vistos = new Map<string, { codigo: string; descripcion: string; veces: number; ultima: string; tarifa: number }>();
  for (const c of compras) {
    let ls: { codigo?: string; cabys?: string; detalle?: string; tarifa?: number }[] = [];
    try { ls = JSON.parse(String(c.lineas_json ?? '[]')); } catch { ls = []; }
    for (const l of ls) {
      const clave = claveMapeo(ced, l.codigo || l.cabys || '', l.detalle ?? '');
      const v = vistos.get(clave) ?? { codigo: String(l.codigo || l.cabys || ''), descripcion: String(l.detalle ?? ''), veces: 0, ultima: String(c.fecha_emision ?? ''), tarifa: Number(l.tarifa ?? 13) };
      v.veces++; vistos.set(clave, v);
    }
  }
  const claves = new Set([...porClave.keys(), ...vistos.keys()]);
  const filas = [...claves].map(clave => {
    const g = porClave.get(clave), v = vistos.get(clave);
    return {
      clave, codigo: String(g?.codigo || v?.codigo || clave.split('|')[1] || ''), descripcion: String(g?.descripcion || v?.descripcion || ''),
      cuenta: String(g?.cuenta ?? ''), credito: String(g?.credito_fiscal ?? ''), destino: String(g?.destino ?? ''), articuloId: g?.articulo_id ? String(g.articulo_id) : null,
      veces: v?.veces ?? 0, ultima: v?.ultima ?? '', tarifa: v?.tarifa ?? null, configurado: Boolean(g?.cuenta),
    };
  }).sort((a, b) => Number(a.configurado) - Number(b.configurado) || b.veces - a.veces);
  return NextResponse.json(filas);
}

export async function PUT(req: NextRequest) {
  const b = await req.json().catch(() => ({}));
  const ced = dig(b.proveedor);
  if (!ced || !(b.codigo || b.descripcion)) return NextResponse.json({ error: 'Faltan el proveedor y el código o descripción del artículo.' }, { status: 400 });
  if (!b.cuenta) return NextResponse.json({ error: 'Elige la cuenta contable del artículo.' }, { status: 400 });
  if (b.destino === 'inventario' && !b.articuloId) return NextResponse.json({ error: 'Para mandarlo a inventario, elige el artículo de inventario.' }, { status: 400 });
  const clave = b.clave ? String(b.clave) : claveMapeo(ced, String(b.codigo ?? ''), String(b.descripcion ?? ''));
  const db = await getDb();
  await db.execute({
    sql: `INSERT INTO compras_mapeo (clave, proveedor_identificacion, codigo, cuenta, articulo_id, actualizado, descripcion, credito_fiscal, destino)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(clave) DO UPDATE SET cuenta = excluded.cuenta, articulo_id = excluded.articulo_id, actualizado = excluded.actualizado,
            descripcion = excluded.descripcion, credito_fiscal = excluded.credito_fiscal, destino = excluded.destino`,
    args: [clave, ced, String(b.codigo ?? clave.split('|')[1] ?? ''), String(b.cuenta), b.destino === 'inventario' ? String(b.articuloId) : null,
      new Date().toISOString(), String(b.descripcion ?? ''), String(b.credito ?? ''), String(b.destino ?? 'gasto')],
  });
  return NextResponse.json({ ok: true, clave });
}
