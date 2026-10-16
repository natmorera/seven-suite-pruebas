import { promises as fs } from 'fs';
import { buscarOCrearReceptor } from '@/lib/tercerosServidor';
import { aplicarInventarioVenta } from '@/lib/inventario';
import { getDb } from './db';
import { construirXml, type LineaXml } from './xml';
import { calcularDocumento, type DescuentoLinea, type ExoneracionLinea, type OtroCargo, type OtroImpuestoLinea } from './calculoFactura';
import { codigoTarifaDesdePorcentaje, tarifaPorcentaje } from '@/data/catalogosHacienda';
import { extraerLlaveP12, firmarXml } from './firma';
import { enviarComprobante } from './hacienda';

// ORÍGENES: este módulo de facturación no vive solo — es parte de una suite
// hotelera, y en la mayoría de los hoteles el documento no lo teclea nadie a
// mano acá: nace en el Front Desk al hacer check-out, en el Punto de
// Venta al cobrar en el restaurante/bar, en Inventario cuando se factura una
// venta de bodega, o en el módulo de Tour Operador. 'Manual' es la excepción
// (alguien crea el documento directo en esta pantalla), no la regla.
export const ORIGENES_VALIDOS = ['Manual', 'Front Desk', 'Punto de Venta (POS)', 'Inventario', 'Tour Operador'] as const;
export type Origen = typeof ORIGENES_VALIDOS[number];

export interface CrearDocumentoInput {
  tipo: string;
  emisorId: string;
  cajaId: string;
  clienteId?: string | null;
  receptorNombre?: string;
  receptorTipoIdentificacion?: string;
  receptorNumeroIdentificacion?: string;
  receptorEmail?: string;
  condicionVenta?: string;      // código del catálogo (ver data/catalogosHacienda.ts), default '01' Contado
  plazoDias?: string | number;
  medioPago?: string[];          // uno o más códigos; default ['01'] Efectivo
  medioPagoOtros?: string;       // descripción cuando el medio es 99 (Otros)
  moneda?: 'CRC' | 'USD';
  tipoCambio?: number;
  referencia?: { tipoDocumento: string; numero: string; fecha: string; codigo: string; razon: string };
  lineas: {
    codigoCabys: string; descripcion: string; cantidad: number; precioUnitario: number; impuesto?: number; codigoTarifa?: string;
    unidadMedida?: string; descuento?: DescuentoLinea | null; exoneracion?: ExoneracionLinea | null;
    codigoComercial?: string; tipoCodigoComercial?: string; articuloId?: string | null;
    unidadMedidaComercial?: string; tipoTransaccion?: string;
    otroImpuesto?: OtroImpuestoLinea | null;
  }[];
  actividadReceptor?: string;
  actividadEmisor?: string;   // actividad de la empresa (si no viene: la asociada al cliente o la principal)
  otrosCargos?: OtroCargo[];
  observaciones?: string;
  // Factura electrónica de compra: cómo se registra la compra al aceptarse
  compraCuentaGasto?: string;
  compraCreditoFiscal?: 'pleno' | 'parcial' | 'sin_derecho';
  origen?: Origen;
  origenReferencia?: string; // ej. folio de reserva del PMS, # de venta del POS, etc.
  esBorrador?: boolean;      // "Guardar como borrador": no consume consecutivo ni se envía a Hacienda todavía
}

export interface CrearDocumentoResultado {
  id: string;
  clave: string;
  consecutivo: string;
  firmado: boolean;
  advertenciaFirma?: string;
  simulado: boolean;
  errorEnvio?: string;
  esBorrador: boolean;
}

export async function crearDocumento(body: CrearDocumentoInput): Promise<CrearDocumentoResultado | { error: string }> {
  const db = await getDb();
  // Actividades por defecto desde el perfil del cliente (también para Front Desk,
  // POS, recurrentes y recibos): la nuestra asociada y la principal de él
  if (body.clienteId && (!body.actividadEmisor || !body.actividadReceptor)) {
    const { rows } = await db.execute({ sql: 'SELECT actividad_empresa, actividad_economica FROM clientes WHERE id = ?', args: [body.clienteId] });
    if (!body.actividadEmisor && rows[0]?.actividad_empresa) body = { ...body, actividadEmisor: String(rows[0].actividad_empresa) };
    if (!body.actividadReceptor && rows[0]?.actividad_economica && body.tipo !== 'Tiquete electrónico') body = { ...body, actividadReceptor: String(rows[0].actividad_economica) };
  }

  const emisorRes = await db.execute({ sql: 'SELECT * FROM emisores WHERE id = ?', args: [body.emisorId] });
  const cajaRes = await db.execute({ sql: 'SELECT * FROM cajas WHERE id = ?', args: [body.cajaId] });
  const emisor = emisorRes.rows[0] as unknown as Record<string, string> | undefined;
  const caja = cajaRes.rows[0] as unknown as Record<string, string> | undefined;
  if (!emisor || !caja) return { error: 'Emisor o caja no encontrados.' };

  // PMS/POS mandan la cédula sin clienteId: se enlaza (o se crea como solo receptor).
  if (!body.clienteId && body.receptorNumeroIdentificacion) {
    body.clienteId = await buscarOCrearReceptor(db, { nombre: body.receptorNombre, tipoIdentificacion: body.receptorTipoIdentificacion, identificacion: body.receptorNumeroIdentificacion, email: body.receptorEmail });
  }
  const condicionVenta = body.condicionVenta ?? '01';
  const medioPago = body.medioPago?.length ? body.medioPago : ['01'];
  // Tarifa: el código del catálogo manda; si una integración vieja manda
  // solo el %, se traduce al código correspondiente.
  const lineas: LineaXml[] = (body.lineas ?? []).map((l, i) => {
    const codigoTarifa = l.codigoTarifa ?? codigoTarifaDesdePorcentaje(Number(l.impuesto ?? 13));
    return {
      numero: i + 1, codigoCabys: l.codigoCabys, descripcion: l.descripcion,
      cantidad: l.cantidad, precioUnitario: l.precioUnitario, impuestoPorcentaje: tarifaPorcentaje(codigoTarifa),
      codigoTarifa, unidadMedida: l.unidadMedida, descuento: l.descuento ?? null, exoneracion: l.exoneracion ?? null,
      otroImpuesto: l.otroImpuesto && Number(l.otroImpuesto.tarifa) > 0 ? { ...l.otroImpuesto, tarifa: Number(l.otroImpuesto.tarifa) } : null,
      codigoComercial: l.codigoComercial || undefined, tipoCodigoComercial: l.tipoCodigoComercial || undefined,
      unidadMedidaComercial: l.unidadMedidaComercial?.trim() || undefined, tipoTransaccion: l.tipoTransaccion || undefined,
    };
  });
  const calculo = calcularDocumento(lineas.map(l => ({ ...l, codigoTarifa: l.codigoTarifa ?? '08' })), body.otrosCargos ?? []);
  const subtotal = calculo.totalVentaNeta;
  const iva = calculo.totalImpuesto;
  const total = calculo.totalComprobante;
  const extras = {
    total_descuentos: calculo.totalDescuentos, total_otros_cargos: calculo.totalOtrosCargos,
    otros_cargos_json: body.otrosCargos?.length ? JSON.stringify(calculo.cargos) : null,
    referencia_json: body.referencia ? JSON.stringify(body.referencia) : null,
    observaciones: body.observaciones || null, actividad_receptor: body.actividadReceptor || null, actividad_emisor: body.actividadEmisor || null,
    compra_cuenta_gasto: body.compraCuentaGasto || null, compra_credito_fiscal: body.compraCreditoFiscal || null,
    receptor_tipo_identificacion: body.receptorTipoIdentificacion || null, receptor_identificacion: body.receptorNumeroIdentificacion || null,
  };
  async function guardarExtras(docId: string) {
    const cols = Object.keys(extras) as (keyof typeof extras)[];
    await db.execute({ sql: `UPDATE documentos_emitidos SET ${cols.map(c => `${c} = ?`).join(', ')} WHERE id = ?`, args: [...cols.map(c => extras[c]), docId] });
  }
  async function guardarLineas(docId: string) {
    for (const [k, l] of lineas.entries()) {
      await db.execute({
        sql: `INSERT INTO documentos_emitidos_lineas (id, documento_id, codigo_cabys, descripcion, cantidad, precio_unitario, impuesto, codigo_tarifa,
                descuento, descuento_json, exoneracion_json, unidad_medida, codigo_comercial, tipo_codigo_comercial, articulo_id, unidad_comercial, tipo_transaccion, otro_impuesto_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: ['ln-' + Math.random().toString(36).slice(2), docId, l.codigoCabys, l.descripcion, l.cantidad, l.precioUnitario, l.impuestoPorcentaje,
          l.codigoTarifa ?? '08', calculo.lineas[k].descuento, l.descuento ? JSON.stringify(l.descuento) : null,
          l.exoneracion ? JSON.stringify({ ...l.exoneracion, montoExoneracion: calculo.lineas[k].montoExoneracion }) : null, l.unidadMedida ?? 'Unid',
          l.codigoComercial ?? '', l.tipoCodigoComercial ?? '', body.lineas[k]?.articuloId ?? null, l.unidadMedidaComercial ?? '', l.tipoTransaccion ?? '',
          l.otroImpuesto ? JSON.stringify({ ...l.otroImpuesto, monto: calculo.lineas[k].otroImpuesto }) : null],
      });
    }
  }
  const id = '#' + Math.floor(20000 + Math.random() * 9999);

  // Un BORRADOR todavía no existe ante Hacienda: no se le asigna consecutivo
  // ni clave, no se firma, no se envía. Se guarda tal cual para poder
  // retomarlo y emitirlo de verdad más adelante.
  if (body.esBorrador) {
    await db.execute({
      sql: `INSERT INTO documentos_emitidos
        (id, tipo, numero_factura, clave, cliente_id, cliente_nombre, receptor_email, emisor_id, caja_id, fecha_emision, estado, recurrente,
         condicion_venta, medios_pago, es_borrador, moneda, tipo_cambio, subtotal, iva, total, xml, referencia_documento, referencia_motivo,
         origen, origen_referencia, estado_envio)
        VALUES (?, ?, '', '', ?, ?, ?, ?, ?, ?, 'Borrador', 0, ?, ?, 1, ?, ?, ?, ?, ?, '', ?, ?, ?, ?, 'borrador')`,
      args: [
        id, body.tipo, body.clienteId ?? null, body.receptorNombre || 'Consumidor final', body.receptorEmail || null,
        body.emisorId, body.cajaId, new Date().toISOString(), condicionVenta, JSON.stringify(medioPago),
        body.moneda ?? 'CRC', body.tipoCambio ?? 1, subtotal, iva, total,
        body.referencia?.numero ?? null, body.referencia?.razon ?? null,
        body.origen ?? 'Manual', body.origenReferencia ?? null,
      ],
    });
    await guardarLineas(id);
    await guardarExtras(id);
    return { id, clave: '', consecutivo: '', firmado: false, simulado: true, esBorrador: true };
  }

  const numeracionRes = await db.execute({ sql: 'SELECT consecutivo_actual FROM cajas_numeracion WHERE caja_id = ? AND tipo_documento = ?', args: [body.cajaId, body.tipo] });
  const consecutivoActualTipo = numeracionRes.rows[0] ? Number(numeracionRes.rows[0].consecutivo_actual) : 0;
  const consecutivoNum = consecutivoActualTipo + 1;
  const consecutivo = String(consecutivoNum).padStart(10, '0');

  // Datos tributarios guardados del receptor (nombre comercial y ubicación)
  const extraReceptor: { nombreComercial?: string; ubicacion?: { provincia: string; canton: string; distrito: string; otrasSenas: string } } = {};
  if (body.clienteId) {
    const { rows: cl } = await db.execute({ sql: 'SELECT nombre_comercial, provincia, canton, distrito, otras_senas FROM clientes WHERE id = ?', args: [body.clienteId] });
    const c = cl[0];
    if (c?.nombre_comercial) extraReceptor.nombreComercial = String(c.nombre_comercial);
    if (c?.provincia && c.canton && c.distrito) extraReceptor.ubicacion = { provincia: String(c.provincia), canton: String(c.canton), distrito: String(c.distrito), otrasSenas: String(c.otras_senas ?? '') };
  }

  // Factura electrónica de compra: Hacienda pide la actividad y la ubicación del proveedor
  if (body.tipo === 'Factura electrónica de compra' && !body.esBorrador) {
    if (!body.actividadReceptor) return { error: 'Indica la actividad económica del proveedor.' };
    if (!extraReceptor.ubicacion) return { error: 'El proveedor necesita provincia, cantón y distrito: complétalos en la tarjeta del proveedor (Ubicación del proveedor).' };
  }

  const { xml, clave } = construirXml({
    tipoDocumento: body.tipo,
    consecutivo,
    sucursal: caja.sucursal,
    terminal: caja.terminal,
    fechaEmision: new Date(),
    emisor: { nombre: emisor.nombre_comercial, cedulaJuridica: emisor.cedula_juridica, actividadEconomica: body.actividadEmisor || emisor.actividad_economica },
    // Tiquete: el receptor es opcional (consumidor final); si se indicó, va.
    receptor: (body.tipo === 'Tiquete electrónico' && !body.receptorNumeroIdentificacion) ? null : {
      nombre: body.receptorNombre || 'Consumidor final',
      tipoIdentificacion: body.receptorTipoIdentificacion || '01',
      numeroIdentificacion: body.receptorNumeroIdentificacion || '0000000000',
      email: body.receptorEmail || undefined,
      ...extraReceptor,
    },
    actividadReceptor: body.actividadReceptor,
    otrosCargos: body.otrosCargos,
    observaciones: body.observaciones,
    condicionVenta,
    plazoCreditoDias: body.plazoDias ? Number(body.plazoDias) : undefined,
    moneda: body.moneda ?? 'CRC',
    tipoCambio: body.tipoCambio ?? 1,
    lineas,
    medioPago, medioPagoOtros: body.medioPagoOtros,
    referencia: body.referencia,
  });
  // Número consecutivo completo de Hacienda (20 dígitos: sucursal, terminal,
  // tipo y número); es el que va dentro de la clave, posiciones 22 a 41.
  const numeroConsecutivo = /^\d{50}$/.test(clave) ? clave.slice(21, 41) : String(caja.sucursal).padStart(3, '0') + String(caja.terminal).padStart(5, '0') + '00' + consecutivo;

  let xmlFinal = xml;
  let firmado = false;
  let advertenciaFirma: string | undefined;
  if (emisor.llave_cargada && emisor.llave_pfx_path) {
    try {
      const p12Buffer = await fs.readFile(emisor.llave_pfx_path);
      const llave = extraerLlaveP12(p12Buffer, emisor.llave_pin);
      xmlFinal = firmarXml(xml, llave);
      firmado = true;
    } catch (e) {
      advertenciaFirma = 'No se pudo firmar con la llave cargada: ' + (e instanceof Error ? e.message : String(e));
    }
  } else {
    advertenciaFirma = 'Este emisor no tiene una llave criptográfica cargada; el documento se generó SIN FIRMAR.';
  }

  const envio = await enviarComprobante(clave, Buffer.from(xmlFinal).toString('base64'), emisor.cedula_juridica, body.receptorNumeroIdentificacion);

  await db.execute({
    sql: `INSERT INTO documentos_emitidos
      (id, tipo, numero_factura, clave, cliente_id, cliente_nombre, receptor_email, emisor_id, caja_id, fecha_emision, estado, recurrente,
       condicion_venta, medios_pago, es_borrador, moneda, tipo_cambio, subtotal, iva, total, xml, referencia_documento, referencia_motivo,
       origen, origen_referencia, estado_envio, ultimo_error)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id, body.tipo, numeroConsecutivo, clave, body.clienteId ?? null, body.receptorNombre || 'Consumidor final', body.receptorEmail || null,
      body.emisorId, body.cajaId, new Date().toISOString(), envio.estadoInicial, condicionVenta, JSON.stringify(medioPago),
      body.moneda ?? 'CRC', body.tipoCambio ?? 1, subtotal, iva, total, xmlFinal,
      body.referencia?.numero ?? null, body.referencia?.razon ?? null,
      body.origen ?? 'Manual', body.origenReferencia ?? null,
      envio.error ? 'error' : envio.simulado ? 'simulado' : 'enviado', envio.error ?? null,
    ],
  });

  await guardarLineas(id);
  await guardarExtras(id);
  // La de compra no rebaja existencias: entran cuando se registra la compra
  // Tampoco el recibo de pago: la mercancía salió con la factura original
  if (body.tipo !== 'Factura electrónica de compra' && body.tipo !== 'Recibo Electrónico de Pago') await aplicarInventarioVenta(db, id);

  if (numeracionRes.rows[0]) {
    await db.execute({ sql: 'UPDATE cajas_numeracion SET consecutivo_actual = ? WHERE caja_id = ? AND tipo_documento = ?', args: [consecutivoNum, body.cajaId, body.tipo] });
  } else {
    await db.execute({
      sql: 'INSERT INTO cajas_numeracion (id, caja_id, tipo_documento, consecutivo_actual) VALUES (?, ?, ?, ?)',
      args: ['cn-' + Math.random().toString(36).slice(2), body.cajaId, body.tipo, consecutivoNum],
    });
  }

  return { id, clave, consecutivo: numeroConsecutivo, firmado, advertenciaFirma, simulado: envio.simulado, errorEnvio: envio.error, esBorrador: false };
}
