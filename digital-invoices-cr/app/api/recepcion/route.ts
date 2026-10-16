import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { guardarCompra, type ResultadoCompra } from '@/lib/comprasGuardar';
import { autoImportarPendientes } from '@/lib/comprasAuto';

export async function GET() {
  const db = await getDb();
  // xml fuera del listado (puede pesar); se pide aparte si hace falta
  const { rows } = await db.execute(`SELECT (SELECT a.consecutivo FROM asientos a WHERE a.documento_ref_id = documentos_recibidos.id LIMIT 1) AS asiento_consecutivo,
      id, proveedor, numero_factura, fecha_emision, fecha_aceptacion, estado, total_factura,
      subtotal, iva, tarifa, tipo_credito_fiscal, origen, clave, tipo, proveedor_identificacion, proveedor_correo,
      receptor_identificacion, moneda, tipo_cambio, total_exento, total_descuentos, total_otros_cargos,
      actividad_economica, lineas_json, correo_id, tipo_acuse, mensaje_acuse, ultimo_error,
      cuenta_proveedor, cuenta_proveedor_nombre, clasificacion, actividad_proveedor
    FROM documentos_recibidos ORDER BY fecha_emision DESC`);
  return NextResponse.json(rows);
}

const r2 = (n: number) => Math.round(n * 100) / 100;
function nuevoId() { return '00000100004' + Math.floor(1000 + Math.random() * 8999) + Math.floor(Math.random() * 10); }

// Tres formas de llegar aquí:
//  (a) { documentos: [...] } — importación desde XML real o desde correos,
//      uno o muchos a la vez (ver ImportarComprasModal). Cada documento trae
//      lo leído del XML + la clasificación elegida (actividad, crédito
//      fiscal) y opcionalmente emitirAcuse para aceptar en el mismo paso.
//  (b) formulario "Crear manualmente": subtotal + tarifa, se calcula el IVA.
//  (c) forma vieja { proveedor, numeroFactura, totalFactura }.
/* eslint-disable @typescript-eslint/no-explicit-any */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const db = await getDb();

  if (Array.isArray(body.documentos)) {
    const resultados: ResultadoCompra[] = [];
    for (const d of body.documentos as any[]) {
      const r = await guardarCompra(db, d);
      resultados.push(r);
      // Aprender la actividad del proveedor: si no tenía una asociada (o se pidió
      // recordarla), la elegida queda como la de sus próximas compras
      const ced = String(d.proveedorIdentificacion ?? '').replace(/\D/g, '');
      if (r.ok && ced && d.actividadEconomica) {
        await db.execute({
          sql: `UPDATE clientes SET actividad_empresa = ? WHERE REPLACE(REPLACE(COALESCE(numero_identificacion,''),'-',''),' ','') = ?
                AND (${d.recordarActividad ? '1 = 1' : "COALESCE(actividad_empresa, '') = ''"})`,
          args: [String(d.actividadEconomica), ced],
        });
      }
    }
    // Lo recién aprendido puede destrabar correos que esperaban en la bandeja
    // (del mismo proveedor): esos se importan solos, listos para el acuse.
    const automaticas = await autoImportarPendientes(db);
    return NextResponse.json({ resultados, automaticas });
  }

  // (b) y (c)
  const id = nuevoId();
  const tarifa = body.tarifa ?? 13;
  const subtotal = body.subtotal ?? (body.totalFactura != null ? r2(Number(body.totalFactura) / (1 + tarifa / 100)) : null);
  const iva = subtotal !== null ? r2(subtotal * (tarifa / 100)) : null;
  const total = body.subtotal != null ? r2(body.subtotal + iva!) : body.totalFactura;
  await db.execute({
    sql: `INSERT INTO documentos_recibidos
      (id, proveedor, numero_factura, fecha_emision, fecha_aceptacion, estado, total_factura, subtotal, iva, tarifa, tipo_credito_fiscal, origen)
      VALUES (?, ?, ?, ?, NULL, 'Recibido', ?, ?, ?, ?, ?, ?)`,
    args: [id, body.proveedor ?? 'Proveedor importado', body.numeroFactura, new Date().toISOString(), total, subtotal, iva, tarifa,
      body.tipoCreditoFiscal ?? 'pleno', body.origen ?? 'xml'],
  });
  return NextResponse.json({ id });
}
/* eslint-enable @typescript-eslint/no-explicit-any */
