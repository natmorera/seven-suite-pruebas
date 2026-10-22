import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { crearAsientoPorCompra } from '@/lib/asientoAutomatico';
import { aplicarInventarioCompra } from '@/lib/inventario';
import { asegurarProveedor } from '@/lib/tercerosServidor';
import type { InValue } from '@libsql/client';
import { conPaisDeSolicitud } from '@/lib/paisServidor';

// Una compra con todo lo que muestra su detalle: la compra, el XML, el asiento,
// la empresa (receptora) y el perfil del proveedor si está en la base.
async function manejarGET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await getDb();
  const { rows } = await db.execute({ sql: `SELECT d.*, (SELECT a.consecutivo FROM asientos a WHERE a.documento_ref_id = d.id AND COALESCE(a.anulado, 0) = 0 LIMIT 1) AS asiento_consecutivo
    FROM documentos_recibidos d WHERE d.id = ?`, args: [id] });
  const c = rows[0];
  if (!c) return NextResponse.json({ error: 'No encontrada' }, { status: 404 });
  const ced = String(c.proveedor_identificacion ?? '').toUpperCase().replace(/[^\dK]/g, '');
  const [{ rows: em }, { rows: pv }] = await Promise.all([
    db.execute('SELECT * FROM emisores ORDER BY activo DESC LIMIT 1'),
    ced ? db.execute({ sql: `SELECT * FROM clientes WHERE REPLACE(REPLACE(COALESCE(numero_identificacion,''),'-',''),' ','') = ? LIMIT 1`, args: [ced] }) : Promise.resolve({ rows: [] as never[] }),
  ]);
  return NextResponse.json({ ...c, empresa: em[0] ?? null, perfil_proveedor: pv[0] ?? null });
}

// Emitir acuse (mensaje receptor) o cambiar clasificación de una compra.
// body: { estado: 'Aceptado' | 'Rechazado', tipoAcuse?: 'total' | 'parcial' | 'rechazo',
//         mensaje?: string, tipoCreditoFiscal?, actividadEconomica? }
async function manejarPATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const db = await getDb();

  const previo = await db.execute({ sql: 'SELECT estado, subtotal, iva, tarifa, total_factura, proveedor, proveedor_identificacion, proveedor_correo FROM documentos_recibidos WHERE id = ?', args: [id] });
  const fila = previo.rows[0];
  if (!fila) return NextResponse.json({ error: 'No encontrada' }, { status: 404 });
  const estadoAnterior = fila.estado as string | undefined;

  const sets: string[] = [];
  const args: InValue[] = [];
  const set = (col: string, v: InValue) => { sets.push(`${col} = ?`); args.push(v); };

  if (body.estado) {
    set('estado', body.estado);
    set('tipo_acuse', body.tipoAcuse ?? (body.estado === 'Rechazado' ? 'rechazo' : 'total'));
    if (body.estado === 'Aceptado' || body.estado === 'Rechazado') set('fecha_aceptacion', new Date().toISOString());
  }
  if ('mensaje' in body) set('mensaje_acuse', body.mensaje ?? null);
  if (body.tipoCreditoFiscal) set('tipo_credito_fiscal', body.tipoCreditoFiscal);
  // La actividad viaja en el acuse: una vez emitido (Aceptado o Rechazado) queda fija
  const actividadFija = estadoAnterior === 'Aceptado' || estadoAnterior === 'Rechazado';
  if (body.actividadEconomica && !actividadFija) set('actividad_economica', body.actividadEconomica);
  // La actividad con que facturó el proveedor: si no la tenía registrada, se agrega a su perfil
  if (body.registrarActividadProveedor) {
    const { rows: pr } = await db.execute({ sql: 'SELECT proveedor_identificacion, actividad_proveedor FROM documentos_recibidos WHERE id = ?', args: [id] });
    const ced = String(pr[0]?.proveedor_identificacion ?? '').replace(/\D/g, '');
    const act = String(body.registrarActividadProveedor);
    if (ced) {
      const { rows: t } = await db.execute({ sql: `SELECT id, actividades_json, actividad_economica FROM clientes WHERE REPLACE(REPLACE(COALESCE(numero_identificacion,''),'-',''),' ','') = ? LIMIT 1`, args: [ced] });
      if (t[0]) {
        let l: string[] = [];
        try { l = t[0].actividades_json ? JSON.parse(String(t[0].actividades_json)) : (t[0].actividad_economica ? [String(t[0].actividad_economica)] : []); } catch { l = []; }
        if (!l.some(x => x.split(' - ')[0] === act.split(' - ')[0])) {
          l.push(act);
          await db.execute({ sql: 'UPDATE clientes SET actividades_json = ?, actividad_economica = COALESCE(NULLIF(actividad_economica, \'\'), ?) WHERE id = ?', args: [JSON.stringify(l), act, String(t[0].id)] });
        }
      }
    }
  }
  // «Recordar para este proveedor»: la actividad queda como la de sus próximas compras
  if (body.actividadEconomica && body.recordarActividad && !actividadFija) {
    const { rows: pr } = await db.execute({ sql: 'SELECT proveedor_identificacion FROM documentos_recibidos WHERE id = ?', args: [id] });
    const ced = String(pr[0]?.proveedor_identificacion ?? '').replace(/\D/g, '');
    if (ced) await db.execute({ sql: `UPDATE clientes SET actividad_empresa = ? WHERE REPLACE(REPLACE(COALESCE(numero_identificacion,''),'-',''),' ','') = ?`, args: [String(body.actividadEconomica), ced] });
  }
  // Cuenta del proveedor (nivel 4) elegida al emitir el acuse, si la compra no la tenía
  if (body.cuentaProveedor) {
    set('cuenta_proveedor', body.cuentaProveedor);
    if (body.cuentaProveedorNombre) set('cuenta_proveedor_nombre', body.cuentaProveedorNombre);
    if (body.crearProveedor) {
      await asegurarProveedor(db, { nombre: String(fila.proveedor ?? ''), identificacion: String(fila.proveedor_identificacion ?? ''), correo: String(fila.proveedor_correo ?? ''), cuentaCode: body.cuentaProveedor });
    }
  }
  if (Array.isArray(body.lineas)) set('lineas_json', JSON.stringify(body.lineas));

  // Compras viejas sin desglose: sin esto el asiento automático salía en 0.
  if (fila.subtotal == null && fila.total_factura != null) {
    const tarifa = Number(fila.tarifa ?? 13);
    const sub = Math.round(Number(fila.total_factura) / (1 + tarifa / 100) * 100) / 100;
    set('subtotal', sub);
    set('iva', Math.round((Number(fila.total_factura) - sub) * 100) / 100);
  }

  if (sets.length) {
    args.push(id);
    await db.execute({ sql: `UPDATE documentos_recibidos SET ${sets.join(', ')} WHERE id = ?`, args });
  }

  // El asiento se genera SOLO en la transición hacia 'Aceptado' (la función
  // además es idempotente por su cuenta).
  let asiento: { creado: boolean; asientoId?: string; consecutivo?: string } | null = null;
  // generarAsiento: el usuario lo decide al emitir el acuse (por defecto sí)
  if (body.estado === 'Aceptado' && estadoAnterior !== 'Aceptado' && body.generarAsiento !== false) {
    asiento = await crearAsientoPorCompra(id);
  }
  if (body.estado === 'Aceptado') await aplicarInventarioCompra(db, id);
  return NextResponse.json({ ok: true, asiento });
}

async function manejarDELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // Una compra importada ya es parte de la contabilidad y del IVA: no se
  // elimina. Solo se descartan los correos que siguen «Por importar».
  void id;
  return NextResponse.json({ error: 'Una compra importada no se puede eliminar. Solo se eliminan las facturas que siguen en «Por importar».' }, { status: 409 });
}

// Cada solicitud corre con el país de la empresa elegida
export const GET = conPaisDeSolicitud(manejarGET);
export const PATCH = conPaisDeSolicitud(manejarPATCH);
export const DELETE = conPaisDeSolicitud(manejarDELETE);
