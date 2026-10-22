// Emitir un documento nuevo copiando las líneas y condiciones de otro ya
// emitido. Lo usan Refacturar (otro receptor, con referencia al original) y
// las facturas recurrentes que se emiten solas (mismo receptor).
import type { Client } from '@libsql/client';
import { crearDocumento, type CrearDocumentoInput, type CrearDocumentoResultado } from '@/lib/crearDocumento';
import { siguienteFecha } from '@/lib/recurrencia';
import { enviarDocumentoPorCorreo } from '@/lib/correo';

export interface ReceptorCopia { clienteId?: string | null; nombre: string; tipoIdentificacion?: string; numeroIdentificacion?: string; email?: string }

export async function emitirCopia(db: Client, documentoId: string, op: {
  receptor?: ReceptorCopia;                       // sin receptor: el mismo del original
  referencia?: CrearDocumentoInput['referencia'];
  observaciones?: string;
}): Promise<CrearDocumentoResultado | { error: string }> {
  const { rows } = await db.execute({ sql: 'SELECT * FROM documentos_emitidos WHERE id = ?', args: [documentoId] });
  const doc = rows[0];
  if (!doc) return { error: 'No se encontró el documento.' };
  const { rows: lineas } = await db.execute({ sql: 'SELECT * FROM documentos_emitidos_lineas WHERE documento_id = ?', args: [documentoId] });
  if (!lineas.length) return { error: 'Este documento no tiene líneas guardadas.' };
  let medios: string[] = ['01'];
  try { const m = JSON.parse(String(doc.medios_pago ?? '["01"]')); if (Array.isArray(m) && m.length) medios = m.map(String); } catch { /* efectivo */ }
  const mismo = !op.receptor;
  const r: ReceptorCopia = op.receptor ?? {
    clienteId: doc.cliente_id ? String(doc.cliente_id) : null, nombre: String(doc.cliente_nombre ?? ''),
    tipoIdentificacion: doc.receptor_tipo_identificacion ? String(doc.receptor_tipo_identificacion) : undefined,
    numeroIdentificacion: doc.receptor_identificacion ? String(doc.receptor_identificacion) : undefined,
    email: doc.receptor_email ? String(doc.receptor_email) : undefined,
  };
  const condicion = String(doc.condicion_venta ?? '01');
  // El plazo no se guarda en el documento: se toma el del cliente (o 30 días)
  let plazo: number | undefined;
  if (condicion === '02' || condicion === '10') {
    const { rows: cl } = r.clienteId ? await db.execute({ sql: 'SELECT dias_credito FROM clientes WHERE id = ?', args: [r.clienteId] }) : { rows: [] };
    plazo = Number(cl[0]?.dias_credito ?? 0) || 30;
  }
  let emisorId = String(doc.emisor_id ?? ''), cajaId = String(doc.caja_id ?? '');
  const { rows: em } = await db.execute({ sql: 'SELECT id FROM emisores WHERE id = ?', args: [emisorId] });
  if (!em.length) emisorId = String((await db.execute('SELECT id FROM emisores ORDER BY activo DESC LIMIT 1')).rows[0]?.id ?? '');
  const { rows: cj } = await db.execute({ sql: 'SELECT id FROM cajas WHERE id = ? AND COALESCE(activa, 1) = 1', args: [cajaId] });
  if (!cj.length) cajaId = String((await db.execute({ sql: 'SELECT id FROM cajas WHERE emisor_id = ? AND COALESCE(activa, 1) = 1 LIMIT 1', args: [emisorId] })).rows[0]?.id
    ?? (await db.execute('SELECT id FROM cajas WHERE COALESCE(activa, 1) = 1 LIMIT 1')).rows[0]?.id ?? '');
  return crearDocumento({
    tipo: mismo ? String(doc.tipo) : 'Factura electrónica',
    emisorId, cajaId,
    clienteId: r.clienteId ?? null, receptorNombre: r.nombre, receptorTipoIdentificacion: r.tipoIdentificacion,
    receptorNumeroIdentificacion: r.numeroIdentificacion, receptorEmail: r.email,
    condicionVenta: condicion, plazoDias: plazo, medioPago: medios,
    moneda: doc.moneda === 'USD' ? 'USD' : 'CRC', tipoCambio: Number(doc.tipo_cambio ?? 1),
    actividadReceptor: mismo && doc.actividad_receptor ? String(doc.actividad_receptor) : undefined,
    referencia: op.referencia,
    lineas: lineas.map(l => ({
      codigoCabys: String(l.codigo_cabys), descripcion: String(l.descripcion), cantidad: Number(l.cantidad), precioUnitario: Number(l.precio_unitario),
      impuesto: Number(l.impuesto), codigoTarifa: l.codigo_tarifa ? String(l.codigo_tarifa) : undefined, unidadMedida: l.unidad_medida ? String(l.unidad_medida) : undefined,
      descuento: l.descuento_json ? JSON.parse(String(l.descuento_json)) : null,
      // La exoneración es del receptor: se conserva solo si es el mismo
      exoneracion: mismo && l.exoneracion_json ? JSON.parse(String(l.exoneracion_json)) : null,
      codigoComercial: l.codigo_comercial ? String(l.codigo_comercial) : undefined, tipoCodigoComercial: l.tipo_codigo_comercial ? String(l.tipo_codigo_comercial) : undefined,
      articuloId: l.articulo_id ? String(l.articulo_id) : null,
      unidadMedidaComercial: l.unidad_comercial ? String(l.unidad_comercial) : undefined, tipoTransaccion: l.tipo_transaccion ? String(l.tipo_transaccion) : undefined,
    })),
    observaciones: op.observaciones,
  });
}

// Avanza una recurrencia a su siguiente fecha (la termina si pasa del fin).
export async function avanzarRecurrencia(db: Client, id: string, accion: 'emitida' | 'omitir') {
  const { rows } = await db.execute({ sql: 'SELECT * FROM documentos_recurrentes WHERE id = ?', args: [id] });
  const r = rows[0];
  if (!r) return null;
  const proxima = siguienteFecha(String(r.proxima), String(r.frecuencia));
  const terminada = Boolean(r.fin) && proxima > String(r.fin);
  await db.execute({
    sql: `UPDATE documentos_recurrentes SET proxima = ?, ultima = CASE WHEN ? = 'emitida' THEN ? ELSE ultima END,
            emitidas = emitidas + CASE WHEN ? = 'emitida' THEN 1 ELSE 0 END, activa = ?, ultimo_error = '' WHERE id = ?`,
    args: [proxima, accion, new Date().toISOString().slice(0, 10), accion, terminada ? 0 : 1, id],
  });
  return { proxima, terminada };
}

// Emite solas las recurrentes en modo «automática» cuya fecha ya llegó.
export async function emitirRecurrentesAutomaticas(db: Client): Promise<{ emitidas: string[]; sinCorreo: string[]; errores: string[] }> {
  const hoy = new Date().toISOString().slice(0, 10);
  const { rows } = await db.execute({
    sql: `SELECT r.id, r.documento_id, d.cliente_nombre FROM documentos_recurrentes r JOIN documentos_emitidos d ON d.id = r.documento_id
          WHERE r.activa = 1 AND COALESCE(r.modo, 'revisar') = 'automatica' AND r.proxima <= ?`, args: [hoy],
  });
  const emitidas: string[] = [], sinCorreo: string[] = [], errores: string[] = [];
  for (const r of rows) {
    const res = await emitirCopia(db, String(r.documento_id), { observaciones: 'Factura recurrente' }).catch(e => ({ error: String(e?.message ?? e) }));
    if ('error' in res) {
      errores.push(`${r.cliente_nombre}: ${res.error}`);
      await db.execute({ sql: 'UPDATE documentos_recurrentes SET ultimo_error = ? WHERE id = ?', args: [res.error, String(r.id)] });
      continue;
    }
    await avanzarRecurrencia(db, String(r.id), 'emitida');
    // Queda marcada para el aviso del Dashboard hasta que se vea
    await db.execute({ sql: 'UPDATE documentos_emitidos SET emitida_sola = 1, aviso_visto = 0, recurrencia_id = ? WHERE id = ?', args: [String(r.id), res.id] });
    // Se envía sola al receptor (correo y copias guardadas)
    const { rows: dest } = await db.execute({ sql: `SELECT d.receptor_email, c.correos_copia FROM documentos_emitidos d LEFT JOIN clientes c ON c.id = d.cliente_id WHERE d.id = ?`, args: [res.id] });
    const para = [dest[0]?.receptor_email, ...String(dest[0]?.correos_copia ?? '').split(/[\s,;]+/)].map(x => String(x ?? '').trim()).filter(Boolean);
    if (para.length) await enviarDocumentoPorCorreo(res.id, para).catch(() => { /* queda en 'error'; se reenvía desde Ventas */ });
    else {
      await db.execute({ sql: `UPDATE documentos_emitidos SET envio_correo = 'sin_correo' WHERE id = ?`, args: [res.id] });
      sinCorreo.push(`${res.consecutivo} · ${r.cliente_nombre}`);
    }
    emitidas.push(`${res.consecutivo} · ${r.cliente_nombre}`);
  }
  return { emitidas, sinCorreo, errores };
}
