import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { perfilAColumnas, type Perfil } from '@/data/terceros';
import type { InValue } from '@libsql/client';
import { crearCuentaTercero } from '@/lib/tercerosServidor';

// Editar un cliente/proveedor: { perfil } desde Contabilidad, o campos
// sueltos desde Facturación ("Modificar" en Nueva factura, guardado permanente).
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const db = await getDb();
  let campos: Record<string, InValue> = {};
  if ('esReceptor' in body) await db.execute({ sql: 'UPDATE clientes SET es_receptor = ? WHERE id = ?', args: [body.esReceptor ? 1 : 0, id] });
  // Al crear la cuenta se elige si es de cliente o de proveedor (define el detalle 110 o 300)
  if (body.crearCuenta && (body.tipo === 'cliente' || body.tipo === 'proveedor')) {
    await db.execute({ sql: 'UPDATE clientes SET tipo = ? WHERE id = ?', args: [body.tipo, id] });
  }
  if (body.crearCuenta) {
    const cuenta = await crearCuentaTercero(db, id);
    if (!body.perfil && Object.keys(body).every(k => ['crearCuenta', 'esReceptor', 'diasCredito', 'tipo'].includes(k))) {
      if ('diasCredito' in body) await guardarDiasCredito(db, id, Number(body.diasCredito) || 0);
      return NextResponse.json({ ok: true, cuenta });
    }
  }
  if (body.perfil) {
    campos = perfilAColumnas({ ...(body.perfil as Perfil), id });
  } else {
    const MAPA: Record<string, string> = {
      nombre: 'nombre', tipoIdentificacion: 'tipo_identificacion', numeroIdentificacion: 'numero_identificacion',
      email: 'email', telefono: 'telefono', direccionFiscal: 'direccion_fiscal', actividadEconomica: 'actividad_economica',
      nombreComercial: 'nombre_comercial', correosCopia: 'correos_copia', provincia: 'provincia', canton: 'canton',
      distrito: 'distrito', otrasSenas: 'otras_senas', cuentaGasto: 'cuenta_gasto', correosCompra: 'correos_compra',
      diasCredito: 'dias_credito', regimen: 'regimen', representanteLegal: 'representante_legal',
      actividadesJson: 'actividades_json', actividadEmpresa: 'actividad_empresa', generaReciboPago: 'genera_recibo_pago',
    };
    for (const [k, col] of Object.entries(MAPA)) if (k in body) campos[col] = body[k] ?? null;
    if ('exoneracionId' in body) { campos.exoneracion_codigo = body.exoneracionId || null; campos.exonerado = body.exoneracionId ? 1 : 0; }
    if ('comprasAuto' in body) campos.compras_auto = body.comprasAuto === null ? null : body.comprasAuto ? 1 : 0;
  }
  if (body.perfil) campos.con_cuenta = 1;
  const cols = Object.keys(campos);
  if (!cols.length) return NextResponse.json({ ok: true });
  await db.execute({ sql: `UPDATE clientes SET ${cols.map(c => `${c} = ?`).join(', ')} WHERE id = ?`, args: [...cols.map(c => campos[c]), id] });
  // Si el registro tiene perfil completo de Contabilidad, mantenerlo en sincronía
  if (!body.perfil) {
    const { rows } = await db.execute({ sql: 'SELECT datos_json FROM clientes WHERE id = ?', args: [id] });
    const dj = rows[0]?.datos_json;
    if (dj) {
      try {
        const p = JSON.parse(String(dj));
        if ('nombre' in body) p.nombre = body.nombre;
        if ('email' in body) p.correo = body.email ?? '';
        if ('telefono' in body) p.telefono = body.telefono ?? '';
        if ('numeroIdentificacion' in body) p.numeroIdentificacion = body.numeroIdentificacion ?? '';
        if ('actividadEconomica' in body) p.actividadEconomica = body.actividadEconomica ?? '';
        if ('nombreComercial' in body) p.nombreComercial = body.nombreComercial ?? '';
        if ('regimen' in body) p.regimenTributario = body.regimen ?? '';
        if ('representanteLegal' in body) p.representanteLegal = body.representanteLegal ?? '';
        if ('diasCredito' in body) p.diasCredito = Number(body.diasCredito) || 0;
        if ('tipoIdentificacion' in body) p.tipoIdTributaria = body.tipoIdentificacion;
        if ('direccionFiscal' in body) p.direccion = body.direccionFiscal ?? p.direccion;
        await db.execute({ sql: 'UPDATE clientes SET datos_json = ? WHERE id = ?', args: [JSON.stringify(p), id] });
      } catch { /* perfil ilegible: se deja como está */ }
    }
  }
  return NextResponse.json({ ok: true });
}

async function guardarDiasCredito(db: Awaited<ReturnType<typeof getDb>>, id: string, dias: number) {
  await db.execute({ sql: 'UPDATE clientes SET dias_credito = ? WHERE id = ?', args: [dias, id] });
  const { rows } = await db.execute({ sql: 'SELECT datos_json FROM clientes WHERE id = ?', args: [id] });
  if (!rows[0]?.datos_json) return;
  try {
    const p = JSON.parse(String(rows[0].datos_json)); p.diasCredito = dias;
    await db.execute({ sql: 'UPDATE clientes SET datos_json = ? WHERE id = ?', args: [JSON.stringify(p), id] });
  } catch { /* perfil ilegible */ }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await getDb();
  await db.execute({ sql: 'DELETE FROM clientes WHERE id = ?', args: [id] });
  return NextResponse.json({ ok: true });
}
