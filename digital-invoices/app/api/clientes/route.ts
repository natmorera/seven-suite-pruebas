import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { perfilAColumnas, type Perfil } from '@/data/terceros';
import { crearCuentaTercero } from '@/lib/tercerosServidor';
import { conPaisDeSolicitud } from '@/lib/paisServidor';

// Base ÚNICA de clientes/proveedores: la usan Contabilidad (Configuración >
// Clientes / Proveedores) y Facturación (Nueva factura). Ver data/terceros.ts.
// ?tipo=cliente|proveedor filtra.
async function manejarGET(req: NextRequest) {
  const db = await getDb();
  const tipo = req.nextUrl.searchParams.get('tipo');
  // ?receptores=1: solo los que se pueden usar como receptor de una factura
  const receptores = req.nextUrl.searchParams.get('receptores') === '1';
  const where: string[] = []; const args: string[] = [];
  if (tipo) { where.push('tipo = ?'); args.push(tipo); }
  if (receptores) where.push('COALESCE(es_receptor, 1) = 1');
  const { rows } = await db.execute({ sql: `SELECT * FROM clientes ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY nombre`, args });
  return NextResponse.json(rows);
}

// Dos formas: { perfil } desde Contabilidad (perfil completo), o los campos
// sueltos desde Facturación (alta rápida de un cliente al facturar).
async function manejarPOST(req: NextRequest) {
  const body = await req.json();
  const db = await getDb();
  const id = 'cli-' + Math.random().toString(36).slice(2);
  if (body.perfil) {
    const c = perfilAColumnas({ ...(body.perfil as Perfil), id });
    await db.execute({
      sql: `INSERT INTO clientes (id, nombre, tipo, tipo_identificacion, numero_identificacion, email, telefono, direccion_fiscal,
              actividad_economica, dias_credito, nombre_comercial, activo, datos_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [id, c.nombre, c.tipo, c.tipo_identificacion, c.numero_identificacion, c.email, c.telefono, c.direccion_fiscal,
        c.actividad_economica, c.dias_credito, c.nombre_comercial, c.activo, c.datos_json],
    });
    // Desde Contabilidad siempre lleva cuenta; ¿también se usa como receptor en facturación?
    await db.execute({ sql: 'UPDATE clientes SET con_cuenta = 1, es_receptor = ? WHERE id = ?', args: [body.esReceptor === false ? 0 : body.esReceptor === true ? 1 : (c.tipo === 'proveedor' ? 0 : 1), id] });
    return NextResponse.json({ id });
  }
  if (!body.nombre) return NextResponse.json({ error: 'El nombre es obligatorio.' }, { status: 400 });
  await db.execute({
    sql: `INSERT INTO clientes (id, nombre, tipo, tipo_identificacion, numero_identificacion, email, telefono, direccion_fiscal,
            actividad_economica, dias_credito, exonerado, exoneracion_codigo, exoneracion_porcentaje, exoneracion_articulo, exoneracion_inciso)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id, body.nombre, body.tipo ?? 'cliente', body.tipoIdentificacion ?? '01', body.numeroIdentificacion ?? '', body.email ?? null,
      body.telefono ?? null, body.direccionFiscal ?? null, body.actividadEconomica ?? null, Number(body.diasCredito ?? 0),
      body.exonerado ? 1 : 0, body.exoneracionCodigo ?? null, body.exoneracionPorcentaje ?? null, body.exoneracionArticulo ?? null, body.exoneracionInciso ?? null,
    ],
  });
  // Desde Facturación: receptor, y cuenta auxiliar solo si el usuario la pidió
  await db.execute({ sql: 'UPDATE clientes SET es_receptor = ?, con_cuenta = 0 WHERE id = ?', args: [body.esReceptor === false ? 0 : 1, id] });
  const cuenta = body.crearCuenta ? await crearCuentaTercero(db, id) : null;
  return NextResponse.json({ id, cuenta });
}

// Cada solicitud corre con el país de la empresa elegida
export const GET = conPaisDeSolicitud(manejarGET);
export const POST = conPaisDeSolicitud(manejarPOST);
