// Datos de ejemplo de Guatemala (Hotel Guatemala). La base de Guatemala nace
// con los mismos ejemplos que la de Costa Rica (tiquetes, exportaciones,
// recibos de pago, claves de 50 dígitos, clientes con cédula). Aquí se
// reemplazan por documentos de FEL: factura, factura cambiaria con abonos,
// notas, recibo de anticipos y factura especial, con número de autorización
// (UUID), serie y número; compras de proveedores guatemaltecos (DTE, pequeño
// contribuyente y compra física) y correos del buzón con su DTE.
// Se arma sin pasar por getDb (corre dentro de la migración).
import type { Client } from '@libsql/client';
import { randomUUID } from 'node:crypto';
import { construirXmlFel } from './xmlFel';
import { calcularDocumento, type LineaCalculo } from './calculoFactura';
import { frasesDocumento, serieNumeroDeUuid, type AbonoFcam, type FraseEmisor } from './perfilPais';
import { leerTributariaGT } from './tributariaGT';
import { retencionesFacturaEspecial } from './retenciones';

const r2 = (n: number) => Math.round(n * 100) / 100;
const ITH = { codigo: '03', descripcion: 'Turismo hospedaje', tarifa: 10 };

// ── Clientes y proveedores (mismos ids que los de Costa Rica) ─────────────
// [id, nombre, tipo, tipoId (01 CUI, 02 NIT, 05 extranjero), número, correo, teléfono, dirección]
const TERCEROS: [string, string, string, string, string, string, string, string][] = [
  ['cli-h1', 'Maya Expeditions, S.A.', 'cliente', '02', '12345679', 'facturas@mayaexpeditions.com.gt', '2363-4955', '15 calle 1-91, zona 10, Guatemala'],
  ['cli-h2', 'Agencia de Viajes Tikal Tours, S.A.', 'cliente', '02', '87654326', 'contabilidad@tikaltours.com.gt', '7926-0110', 'Calle Centroamérica, Flores, Petén'],
  ['cli-h3', 'Ana Lucía Morales Pérez', 'cliente', '01', '2547896541701', 'anamorales@correo.gt', '5512-3344', 'Santa Elena, Flores, Petén'],
  ['cli-h4', 'Nature Travel Group LLC', 'cliente', '05', 'US884521', 'billing@naturetravel.com', '+1 305 555 0101', 'Miami, Florida, Estados Unidos'],
  ['ter-c1', 'Distribuidora La Ceiba, S.A.', 'cliente', '02', '5544332K', 'ventas@laceiba.com.gt', '2334-5678', '6a avenida 12-30, zona 1, Guatemala'],
  ['ter-c2', 'Hotel Las Palmas Petén, S.A.', 'cliente', '02', '91827361', 'admin@laspalmaspeten.com.gt', '7926-1212', 'Isla de Flores, Petén'],
  ['ter-p1', 'Ferretería El Martillo, S.A.', 'proveedor', '02', '32165498', 'facturas@elmartillo.com.gt', '7926-3030', '4a calle, Santa Elena, Petén'],
  ['ter-p2', 'Distribuidora Maya, S.A.', 'proveedor', '02', '4567812K', 'ventas@dimaya.gt', '2440-7788', 'Calzada Roosevelt 22-43, zona 11, Guatemala'],
];

async function reemplazarTerceros(db: Client) {
  for (const [id, nombre, tipo, tipoId, num, correo, tel, dir] of TERCEROS) {
    const { rows } = await db.execute({ sql: 'SELECT datos_json FROM clientes WHERE id = ?', args: [id] });
    let datos: Record<string, unknown> | null = null;
    try { datos = rows[0]?.datos_json ? JSON.parse(String(rows[0].datos_json)) : null; } catch { datos = null; }
    if (datos) Object.assign(datos, {
      nombre, numeroIdentificacion: num, pais: 'GT', correo, telefono: tel, direccion: dir, barrioSenas: dir, tipoIdTributaria: tipoId,
      tipoIdentificacion: tipoId === '01' ? 'fisica' : tipoId === '05' ? 'extranjer' : 'juridica',
      actividadEconomica: '', regimenTributario: '', provincia: '', canton: '', distrito: '', nombreComercial: '', bancarias: [],
    });
    const valores = [nombre, tipo, tipoId, num, correo, tel, dir, datos ? JSON.stringify(datos) : null];
    if (rows.length) {
      await db.execute({
        sql: `UPDATE clientes SET nombre = ?, tipo = ?, tipo_identificacion = ?, numero_identificacion = ?, email = ?, telefono = ?, direccion_fiscal = ?,
                datos_json = COALESCE(?, datos_json), actividad_economica = NULL, actividades_json = NULL, actividad_empresa = NULL, regimen = NULL,
                nombre_comercial = NULL, provincia = NULL, canton = NULL, distrito = NULL, otras_senas = NULL, correos_compra = NULL, exonerado = 0 WHERE id = ?`,
        args: [...valores, id],
      });
    } else {
      await db.execute({
        sql: `INSERT INTO clientes (id, nombre, tipo, tipo_identificacion, numero_identificacion, email, telefono, direccion_fiscal, datos_json, es_receptor, activo)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1)`,
        args: [id, ...valores],
      });
    }
  }
  // Los proveedores de ejemplo mandan sus facturas a este correo
  await db.execute(`UPDATE clientes SET correos_compra = 'fel@elmartillo.com.gt', compras_auto = 0 WHERE id = 'ter-p1'`);
}

// ── Borrar los ejemplos de Costa Rica ─────────────────────────────────────
// Solo lo que vino de Costa Rica: los documentos sin tipo de DTE, las compras
// y correos sin un DTE de FEL. Lo que ya se haya emitido o importado en
// Guatemala se queda.
async function borrarEjemplosCR(db: Client) {
  const docs = (await db.execute(`SELECT id FROM documentos_emitidos WHERE COALESCE(tipo_dte, '') = ''`)).rows.map(r => String(r.id));
  const compras = (await db.execute(`SELECT id FROM documentos_recibidos
    WHERE COALESCE(tipo_dte, '') = '' AND COALESCE(xml, '') NOT LIKE '%GTDocumento%' AND COALESCE(origen, '') <> 'fisica'`)).rows.map(r => String(r.id));
  const refs = [...docs, ...compras];
  for (let k = 0; k < refs.length; k += 200) {
    const parte = refs.slice(k, k + 200);
    const marcas = parte.map(() => '?').join(',');
    const { rows: as } = await db.execute({ sql: `SELECT id FROM asientos WHERE documento_ref_id IN (${marcas})`, args: parte });
    for (const a of as) {
      await db.execute({ sql: 'DELETE FROM asientos_lineas WHERE asiento_id = ?', args: [String(a.id)] });
      await db.execute({ sql: 'DELETE FROM asientos WHERE id = ?', args: [String(a.id)] });
    }
    await db.execute({ sql: `DELETE FROM inventario_movimientos WHERE documento_ref_id IN (${marcas})`, args: parte }).catch(() => null);
    await db.execute({ sql: `DELETE FROM documentos_emitidos_lineas WHERE documento_id IN (${marcas})`, args: parte });
    await db.execute({ sql: `DELETE FROM documentos_recurrentes WHERE documento_id IN (${marcas})`, args: parte });
    await db.execute({ sql: `DELETE FROM cuotas_credito WHERE factura_id IN (${marcas})`, args: parte }).catch(() => null);
    await db.execute({ sql: `DELETE FROM eventos_origen WHERE documento_id IN (${marcas})`, args: parte }).catch(() => null);
    await db.execute({ sql: `DELETE FROM documentos_emitidos WHERE id IN (${marcas})`, args: parte });
    await db.execute({ sql: `DELETE FROM documentos_recibidos WHERE id IN (${marcas})`, args: parte });
  }
  await db.execute(`DELETE FROM correos WHERE COALESCE(xml, '') NOT LIKE '%GTDocumento%'`);
  await db.execute(`DELETE FROM compras_mapeo WHERE proveedor_identificacion IN ('3101222333', '3101777888', '3101555111')`).catch(() => null);
}

// Productos de ejemplo: precios en quetzales y nombres de Petén
async function ajustarProductos(db: Client) {
  const nombres: [string, string][] = [
    ['Hospedaje habitación superior vista al volcán (noche)', 'Hospedaje habitación superior vista al lago (noche)'],
    ['Tour volcán Arenal y caminata', 'Tour Parque Nacional Tikal'],
    ['Acceso a aguas termales (día)', 'Paseo en lancha por el lago Petén Itzá'],
    ['Transfer aeropuerto – hotel', 'Traslado aeropuerto Mundo Maya – hotel'],
  ];
  for (const [de, a] of nombres) {
    await db.execute({ sql: 'UPDATE cabys_favoritos SET nombre = ?, descripcion = ? WHERE nombre = ?', args: [a, a, de] });
  }
  // Colones a quetzales (≈ 65 colones por quetzal), redondeado a Q5
  await db.execute(`UPDATE cabys_favoritos SET precio_unitario = MAX(5, ROUND(precio_unitario / 65.0 / 5) * 5)
    WHERE COALESCE(moneda, 'CRC') NOT IN ('USD', 'GTQ') AND precio_unitario > 1000`);
}

// ── Ventas ────────────────────────────────────────────────────────────────
type LineaGT = { bs: 'B' | 'S'; desc: string; cant: number; precio: number; unidad: string; exento?: number; ith?: boolean };
interface VentaGT {
  id: string; tipo: string; tipoDte: string; cli: string | null; nombre: string; email: string | null; tipoId: string; idRec: string;
  fecha: string; moneda: 'CRC' | 'USD'; tc: number; cond: string; medios: string[]; origen: string; lineas: LineaGT[];
  abonos?: AbonoFcam[]; ref?: string; motivo?: string; estado?: string; error?: string; caja?: string;
}

async function insertarVenta(db: Client, v: VentaGT, ctx: { emisor: Record<string, unknown>; frasesEmisor: FraseEmisor[]; afiliacion: string; certificador: string; claves: Map<string, { uuid: string; numero: string; fecha: string }> }) {
  const anticipo = v.tipoDte === 'RANT';
  const lineasCalc: (LineaCalculo & { descripcion: string; unidadMedida: string })[] = v.lineas.map(l => ({
    codigoCabys: l.bs, cantidad: l.cant, precioUnitario: l.precio, codigoTarifa: anticipo || l.exento ? '10' : '08',
    otroImpuesto: !anticipo && l.ith ? ITH : null, descripcion: l.desc, unidadMedida: l.unidad,
  }));
  const calc = calcularDocumento(lineasCalc);
  const escenarios = v.lineas.filter(l => l.exento).map(l => l.exento!);
  const frases = frasesDocumento({
    tipoDte: v.tipoDte, frasesEmisor: ctx.frasesEmisor, exportacion: false, hayExentas: !anticipo && escenarios.length > 0, escenariosExencion: escenarios,
  });
  const refDoc = v.ref ? ctx.claves.get(v.ref) : undefined;
  const uuid = randomUUID().toUpperCase();
  const { serie, numero } = serieNumeroDeUuid(uuid);
  const e = ctx.emisor;
  const xmlBase = construirXmlFel({
    tipoDte: v.tipoDte, fechaEmision: new Date(v.fecha), moneda: v.moneda, exportacion: false,
    emisor: { nit: String(e.cedula_juridica), nombre: String(e.razon_social), nombreComercial: String(e.nombre_comercial), establecimiento: '1',
      afiliacionIva: ctx.afiliacion, correo: String(e.correo_electronico ?? ''), direccion: String(e.otras_senas ?? ''),
      codigoPostal: String(e.distrito ?? ''), municipio: String(e.canton ?? ''), departamento: String(e.provincia ?? '') },
    receptor: { tipoId: v.tipoId, numero: v.idRec, nombre: v.nombre, correo: v.email ?? undefined },
    frases, lineas: lineasCalc,
    referencia: refDoc ? { uuid: refDoc.uuid, fecha: refDoc.fecha, serie: refDoc.numero.split('-')[0], numero: refDoc.numero.split('-')[1], motivo: v.motivo ?? 'Ajuste' } : null,
    abonos: v.abonos ?? null,
    retencionesFesp: v.tipoDte === 'FESP' ? retencionesFacturaEspecial(calc.totalVentaNeta, calc.totalImpuesto, calc.totalComprobante) : null,
  });
  const rechazado = v.estado === 'Rechazado';
  const xml = rechazado ? xmlBase : xmlBase.replace('</dte:DTE>', `<dte:Certificacion><dte:NombreCertificador>${ctx.certificador}</dte:NombreCertificador>`
    + `<dte:NumeroAutorizacion Serie="${serie}" Numero="${numero}">${uuid}</dte:NumeroAutorizacion>`
    + `<dte:FechaHoraCertificacion>${v.fecha.slice(0, 19)}</dte:FechaHoraCertificacion></dte:Certificacion></dte:DTE>`);
  const numFactura = rechazado ? '' : `${serie}-${numero}`;
  await db.execute({
    sql: `INSERT INTO documentos_emitidos (id, tipo, numero_factura, clave, cliente_id, cliente_nombre, receptor_email, emisor_id, caja_id, fecha_emision, estado, recurrente,
            condicion_venta, medios_pago, es_borrador, moneda, tipo_cambio, subtotal, iva, total, xml, referencia_documento, referencia_motivo, origen, estado_envio, ultimo_error,
            tipo_dte, frases_json, abonos_json, total_descuentos, total_otros_cargos, receptor_tipo_identificacion, receptor_identificacion, referencia_json, envio_correo)
          VALUES (?, ?, ?, ?, ?, ?, ?, 'em-1', ?, ?, ?, 0, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?)`,
    args: [v.id, v.tipo, numFactura, rechazado ? '' : uuid, v.cli, v.nombre, v.email, v.caja ?? 'caja-1', v.fecha, v.estado ?? 'Aceptado', v.cond, JSON.stringify(v.medios),
      v.moneda, v.tc, r2(calc.totalVentaNeta), r2(calc.totalImpuesto), r2(calc.totalComprobante), xml, refDoc?.numero ?? null, v.ref ? v.motivo ?? null : null, v.origen,
      rechazado ? 'error' : 'enviado', v.error ?? null, v.tipoDte, JSON.stringify(frases), v.abonos ? JSON.stringify(v.abonos) : null, r2(calc.totalDescuentos),
      v.tipoId, v.idRec, refDoc ? JSON.stringify({ numero: refDoc.numero, fecha: refDoc.fecha, razon: v.motivo }) : null, v.email ? 'enviado' : null],
  });
  for (const [k, l] of lineasCalc.entries()) {
    await db.execute({
      sql: `INSERT INTO documentos_emitidos_lineas (id, documento_id, codigo_cabys, descripcion, cantidad, precio_unitario, impuesto, codigo_tarifa, descuento, unidad_medida, otro_impuesto_json, escenario_exencion)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)`,
      args: [`${v.id}-l${k + 1}`, v.id, l.codigoCabys, l.descripcion, l.cantidad, l.precioUnitario, l.codigoTarifa === '08' ? 12 : 0, l.codigoTarifa, l.unidadMedida,
        l.otroImpuesto ? JSON.stringify({ ...l.otroImpuesto, monto: r2(calc.lineas[k].otroImpuesto) }) : null, v.lineas[k].exento ?? null],
    });
  }
  ctx.claves.set(v.id, { uuid, numero: numFactura, fecha: v.fecha });
  return { total: r2(calc.totalComprobante) };
}

// Abonos: el total se reparte en partes iguales (el último ajusta los centavos)
function repartir(total: number, fechas: string[], pagados: (null | { fecha: string; medio: string; comprobante?: string })[]): AbonoFcam[] {
  const parte = r2(total / fechas.length);
  return fechas.map((f, i) => ({
    numero: i + 1, fechaVencimiento: f, monto: i === fechas.length - 1 ? r2(total - parte * (fechas.length - 1)) : parte,
    ...(pagados[i] ? { medio: pagados[i]!.medio, pagado: pagados[i] } : {}),
  }));
}

const HOSPEDAJE = (cant: number, precio: number, desc = 'Hospedaje habitación estándar (noche)'): LineaGT => ({ bs: 'S', desc, cant, precio, unidad: 'Noche', ith: true });

async function sembrarVentas(db: Client) {
  const { rows: em } = await db.execute(`SELECT * FROM emisores WHERE id = 'em-1'`);
  if (!em.length) return;
  const trib = await leerTributariaGT(db);
  const ctx = {
    emisor: em[0] as unknown as Record<string, unknown>, frasesEmisor: [...trib.frasesRtu, ...trib.frases], afiliacion: trib.afiliacionIva || 'GEN',
    certificador: trib.certificadores.find(c => c.principal)?.certificador ?? 'DIGIFACT', claves: new Map<string, { uuid: string; numero: string; fecha: string }>(),
  };
  const v = (x: VentaGT) => insertarVenta(db, x, ctx);
  const C = (id: string) => TERCEROS.find(t => t[0] === id)!;
  const cli = (id: string) => { const t = C(id); return { cli: id, nombre: t[1], email: t[5], tipoId: t[3], idRec: t[4] }; };
  const CF = { cli: null, nombre: 'Consumidor final', email: null, tipoId: '06', idRec: 'CF' };

  // Facturas (FACT) de contado
  await v({ id: '#31001', tipo: 'Factura electrónica', tipoDte: 'FACT', ...cli('cli-h1'), fecha: '2026-09-08T10:15:00', moneda: 'CRC', tc: 1, cond: '01', medios: ['TC'], origen: 'Front Desk',
    lineas: [HOSPEDAJE(3, 850), { bs: 'S', desc: 'Desayuno buffet', cant: 6, precio: 95, unidad: 'Servicio' }] });
  await v({ id: '#31002', tipo: 'Factura electrónica', tipoDte: 'FACT', ...CF, fecha: '2026-09-12T13:40:00', moneda: 'CRC', tc: 1, cond: '01', medios: ['EF'], origen: 'Punto de Venta (POS)', caja: 'caja-2',
    lineas: [{ bs: 'S', desc: 'Almuerzo a la carta', cant: 2, precio: 145, unidad: 'Servicio' }, { bs: 'B', desc: 'Limonada natural', cant: 2, precio: 30, unidad: 'Unid' }] });
  await v({ id: '#31003', tipo: 'Factura electrónica', tipoDte: 'FACT', ...cli('cli-h4'), fecha: '2026-09-15T16:30:00', moneda: 'USD', tc: 7.75, cond: '01', medios: ['TC'], origen: 'Front Desk',
    lineas: [HOSPEDAJE(2, 120, 'Hospedaje habitación superior vista al lago (noche)'), { bs: 'S', desc: 'Tour Parque Nacional Tikal', cant: 2, precio: 85, unidad: 'Persona' }] });
  await v({ id: '#31004', tipo: 'Factura electrónica', tipoDte: 'FACT', ...cli('cli-h3'), fecha: '2026-09-21T11:20:00', moneda: 'CRC', tc: 1, cond: '01', medios: ['TD'], origen: 'Front Desk',
    lineas: [HOSPEDAJE(1, 780), { bs: 'S', desc: 'Lavandería (servicio)', cant: 1, precio: 60, unidad: 'Servicio' }] });
  await v({ id: '#31005', tipo: 'Factura electrónica', tipoDte: 'FACT', ...CF, fecha: '2026-10-03T20:05:00', moneda: 'CRC', tc: 1, cond: '01', medios: ['TC'], origen: 'Punto de Venta (POS)', caja: 'caja-2',
    lineas: [{ bs: 'S', desc: 'Cena a la carta', cant: 3, precio: 185, unidad: 'Servicio' }, { bs: 'B', desc: 'Cerveza nacional', cant: 4, precio: 25, unidad: 'Unid' }] });
  await v({ id: '#31006', tipo: 'Factura electrónica', tipoDte: 'FACT', ...cli('ter-c2'), fecha: '2026-10-01T09:00:00', moneda: 'CRC', tc: 1, cond: '01', medios: ['TC'], origen: 'Manual',
    lineas: [{ bs: 'S', desc: 'Alquiler de salón de eventos (mensual)', cant: 1, precio: 4500, unidad: 'Servicio' }] });
  // Rechazada por el certificador (sin número de autorización)
  await v({ id: '#31007', tipo: 'Factura electrónica', tipoDte: 'FACT', cli: null, nombre: 'Comercial San Benito', email: null, tipoId: '02', idRec: '1234567', fecha: '2026-10-06T15:10:00',
    moneda: 'CRC', tc: 1, cond: '01', medios: ['EF'], origen: 'Manual', estado: 'Rechazado',
    error: 'El NIT del receptor (1234567) no es válido o no está activo en el RTU de la SAT.',
    lineas: [{ bs: 'S', desc: 'Alquiler de sala de reuniones (hora)', cant: 3, precio: 250, unidad: 'Hora' }] });

  // Facturas cambiarias (FCAM) con abonos
  const fcam1 = await v({ id: '#31010', tipo: 'Factura electrónica', tipoDte: 'FCAM', ...cli('cli-h2'), fecha: '2026-09-10T09:05:00', moneda: 'CRC', tc: 1, cond: '02', medios: ['TC'], origen: 'Front Desk',
    lineas: [HOSPEDAJE(8, 750, 'Hospedaje grupo agencia (noche)'), { bs: 'S', desc: 'Traslado aeropuerto Mundo Maya - hotel', cant: 2, precio: 400, unidad: 'Servicio' }] });
  await db.execute({ sql: 'UPDATE documentos_emitidos SET abonos_json = ? WHERE id = ?', args: [JSON.stringify(repartir(fcam1.total, ['2026-10-10', '2026-11-10'],
    [{ fecha: '2026-10-09', medio: 'CH', comprobante: 'Cheque 004512 Banco Industrial' }, null])), '#31010'] });
  const fcam2 = await v({ id: '#31011', tipo: 'Factura electrónica', tipoDte: 'FCAM', ...cli('cli-h1'), fecha: '2026-09-25T14:30:00', moneda: 'USD', tc: 7.75, cond: '02', medios: ['TC'], origen: 'Manual',
    lineas: [{ bs: 'S', desc: 'Paquete de tours Yaxhá y Tikal (grupo)', cant: 12, precio: 95, unidad: 'Persona' }] });
  await db.execute({ sql: 'UPDATE documentos_emitidos SET abonos_json = ? WHERE id = ?', args: [JSON.stringify(repartir(fcam2.total, ['2026-10-15', '2026-11-15', '2026-12-15'], [null, null, null])), '#31011'] });

  // Notas de crédito y débito: referencian una factura
  await v({ id: '#31020', tipo: 'Nota de crédito', tipoDte: 'NCRE', ...cli('cli-h1'), fecha: '2026-09-10T08:30:00', moneda: 'CRC', tc: 1, cond: '01', medios: ['TC'], origen: 'Manual',
    ref: '#31001', motivo: 'Devolución de una noche no utilizada', lineas: [HOSPEDAJE(1, 850)] });
  await v({ id: '#31021', tipo: 'Nota de débito', tipoDte: 'NDEB', ...cli('cli-h3'), fecha: '2026-09-22T09:45:00', moneda: 'CRC', tc: 1, cond: '01', medios: ['TD'], origen: 'Manual',
    ref: '#31004', motivo: 'Consumo de minibar no facturado', lineas: [{ bs: 'B', desc: 'Consumo de minibar', cant: 1, precio: 120, unidad: 'Unid' }] });

  // Recibo de anticipos (RANT): solo servicios y sin impuestos
  await v({ id: '#31030', tipo: 'Recibo de anticipos', tipoDte: 'RANT', ...cli('cli-h3'), fecha: '2026-10-05T10:00:00', moneda: 'CRC', tc: 1, cond: '01', medios: ['TC'], origen: 'Front Desk',
    lineas: [{ bs: 'S', desc: 'Anticipo reservación de boda: salón y 10 habitaciones (diciembre)', cant: 1, precio: 5000, unidad: 'Servicio' }] });
  await v({ id: '#31031', tipo: 'Recibo de anticipos', tipoDte: 'RANT', ...cli('cli-h2'), fecha: '2026-10-08T15:20:00', moneda: 'CRC', tc: 1, cond: '01', medios: ['TD'], origen: 'Front Desk',
    lineas: [{ bs: 'S', desc: 'Depósito de reservación grupo noviembre', cant: 1, precio: 2500, unidad: 'Servicio' }] });

  // Factura especial (FESP): la empresa compra a un vendedor sin facturas (con retenciones)
  await v({ id: '#31040', tipo: 'Factura electrónica de compra', tipoDte: 'FESP', cli: null, nombre: 'Juan Carlos Pop Caal', email: null, tipoId: '01', idRec: '1987456320101',
    fecha: '2026-10-02T11:00:00', moneda: 'CRC', tc: 1, cond: '01', medios: ['EF'], origen: 'Manual',
    lineas: [{ bs: 'B', desc: 'Artesanías de madera para decoración de habitaciones', cant: 12, precio: 150, unidad: 'Unid' }] });

  // Una factura recurrente (alquiler mensual del salón)
  const proxima = new Date(); proxima.setDate(proxima.getDate() + 9);
  await db.execute({ sql: `INSERT INTO documentos_recurrentes (id, documento_id, frecuencia, proxima, activa, creado, modo) VALUES ('rec-gt-1', '#31006', 'mensual', ?, 1, ?, 'revisar')`,
    args: [proxima.toISOString().slice(0, 10), new Date().toISOString()] });
  await db.execute(`UPDATE documentos_emitidos SET recurrente = 1 WHERE id = '#31006'`);
}

// ── Compras ───────────────────────────────────────────────────────────────
// DTE certificado de un proveedor, como lo devuelve su certificador
function dteProveedor(p: { tipo: string; nit: string; nombre: string; afiliacion: string; correo: string; fecha: string; lineas: [string, 'B' | 'S', number, number, boolean][]; abonos?: [string, number][] }) {
  const uuid = randomUUID().toUpperCase();
  const { serie, numero } = serieNumeroDeUuid(uuid);
  let gran = 0, totIva = 0;
  const items = p.lineas.map(([desc, bs, cant, precio, conIva], i) => {
    const total = r2(cant * precio);
    const grav = conIva ? r2(total / 1.12) : total;
    const iva = conIva ? r2(total - grav) : 0;
    gran += total; totIva += iva;
    const imp = conIva ? `<dte:Impuestos><dte:Impuesto><dte:NombreCorto>IVA</dte:NombreCorto><dte:CodigoUnidadGravable>1</dte:CodigoUnidadGravable><dte:MontoGravable>${grav.toFixed(2)}</dte:MontoGravable><dte:MontoImpuesto>${iva.toFixed(2)}</dte:MontoImpuesto></dte:Impuesto></dte:Impuestos>` : '';
    return `<dte:Item NumeroLinea="${i + 1}" BienOServicio="${bs}"><dte:Cantidad>${cant}</dte:Cantidad><dte:UnidadMedida>${bs === 'B' ? 'UNI' : 'SER'}</dte:UnidadMedida><dte:Descripcion>${desc}</dte:Descripcion><dte:PrecioUnitario>${precio.toFixed(2)}</dte:PrecioUnitario><dte:Precio>${total.toFixed(2)}</dte:Precio><dte:Descuento>0</dte:Descuento>${imp}<dte:Total>${total.toFixed(2)}</dte:Total></dte:Item>`;
  }).join('');
  const abonos = p.abonos ? `<dte:Complementos><dte:Complemento NombreComplemento="AbonosFacturaCambiaria"><cfc:AbonosFacturaCambiaria xmlns:cfc="http://www.sat.gob.gt/dte/fel/CompCambiaria/0.1.0" Version="1">${p.abonos.map(([f, mto], i) => `<cfc:Abono><cfc:NumeroAbono>${i + 1}</cfc:NumeroAbono><cfc:FechaVencimiento>${f}</cfc:FechaVencimiento><cfc:MontoAbono>${mto.toFixed(2)}</cfc:MontoAbono></cfc:Abono>`).join('')}</cfc:AbonosFacturaCambiaria></dte:Complemento></dte:Complementos>` : '';
  return `<?xml version="1.0" encoding="UTF-8"?><dte:GTDocumento xmlns:dte="http://www.sat.gob.gt/dte/fel/0.2.0" Version="0.1"><dte:SAT ClaseDocumento="dte"><dte:DTE ID="DatosCertificados"><dte:DatosEmision ID="DatosEmision">`
    + `<dte:DatosGenerales Tipo="${p.tipo}" FechaHoraEmision="${p.fecha}" CodigoMoneda="GTQ"/>`
    + `<dte:Emisor NITEmisor="${p.nit}" NombreEmisor="${p.nombre}" CodigoEstablecimiento="1" AfiliacionIVA="${p.afiliacion}" CorreoEmisor="${p.correo}"/>`
    + `<dte:Receptor IDReceptor="16896963" NombreReceptor="Corporación Petenera de Turismo, S.A."/>`
    + `<dte:Items>${items}</dte:Items><dte:Totales>${totIva ? `<dte:TotalImpuestos><dte:TotalImpuesto NombreCorto="IVA" TotalMontoImpuesto="${r2(totIva).toFixed(2)}"/></dte:TotalImpuestos>` : ''}<dte:GranTotal>${r2(gran).toFixed(2)}</dte:GranTotal></dte:Totales>${abonos}</dte:DatosEmision>`
    + `<dte:Certificacion><dte:NombreCertificador>Infile</dte:NombreCertificador><dte:NumeroAutorizacion Serie="${serie}" Numero="${numero}">${uuid}</dte:NumeroAutorizacion></dte:Certificacion></dte:DTE></dte:SAT></dte:GTDocumento>`;
}

async function sembrarCompras(db: Client) {
  const { parsearCompraXml } = await import('./xmlCompra');
  const { DOMParser } = await import('@xmldom/xmldom');
  const { guardarCompra } = await import('./comprasGuardar');
  const leer = (xml: string) => {
    const r = parsearCompraXml(xml, new DOMParser() as never);
    if (!r.ok) throw new Error(r.error);
    return r.doc;
  };
  const datosCompra = (xml: string, extra: Record<string, unknown>) => {
    const d = leer(xml);
    return {
      ...d, subtotal: d.totalVentaNeta, iva: d.totalImpuesto, total: d.totalComprobante, tarifa: d.tarifaPrincipal, xml, origen: 'xml',
      tipoCreditoFiscal: d.totalImpuesto > 0 ? 'pleno' : 'sin_derecho', generarAsiento: false, emitirAcuse: false, ...extra,
    };
  };
  const P1 = { nit: '32165498', nombre: 'Ferretería El Martillo, S.A.', afiliacion: 'GEN', correo: 'fel@elmartillo.com.gt' };
  const P2 = { nit: '4567812K', nombre: 'Distribuidora Maya, S.A.', afiliacion: 'GEN', correo: 'ventas@dimaya.gt' };
  const PEQ = { nit: '75315947', nombre: 'Panadería San Benito', afiliacion: 'PEQ', correo: 'panaderiasanbenito@gmail.com' };

  // Por aceptar
  await guardarCompra(db, datosCompra(dteProveedor({ tipo: 'FACT', ...P2, fecha: '2026-10-15T09:30:00-06:00',
    lineas: [['Toallas de baño blancas', 'B', 20, 56, true], ['Juego de sábanas matrimonial', 'B', 10, 245, true]] }), {}));
  await guardarCompra(db, datosCompra(dteProveedor({ tipo: 'FACT', ...P1, fecha: '2026-10-12T10:00:00-06:00',
    lineas: [['Pintura látex blanca (galón)', 'B', 6, 185, true], ['Brochas 3 pulgadas', 'B', 4, 22.5, true]] }), {}));
  // Aceptadas (entran al libro de compras)
  const ahora = '2026-10-10T08:00:00';
  const fcam = datosCompra(dteProveedor({ tipo: 'FCAM', ...P2, fecha: '2026-09-28T08:15:00-06:00',
    lineas: [['Amenidades de baño (caja de 100)', 'B', 5, 640, true]], abonos: [['2026-10-28', 1600], ['2026-11-28', 1600]] }), { emitirAcuse: true });
  await guardarCompra(db, fcam);
  await guardarCompra(db, datosCompra(dteProveedor({ tipo: 'FPEQ', ...PEQ, fecha: '2026-10-04T06:30:00-06:00',
    lineas: [['Pan francés (docena)', 'B', 30, 18, false]] }), { emitirAcuse: true }));
  await guardarCompra(db, datosCompra(dteProveedor({ tipo: 'FACT', ...P1, fecha: '2026-09-18T11:40:00-06:00',
    lineas: [['Servicio de reparación de bomba de agua', 'S', 1, 1350, true]] }), { emitirAcuse: true }));
  // Rechazada
  const rech = datosCompra(dteProveedor({ tipo: 'FACT', ...P1, fecha: '2026-09-20T15:00:00-06:00', lineas: [['Cemento gris (saco)', 'B', 15, 82, true]] }), {});
  await guardarCompra(db, rech);
  await db.execute({ sql: `UPDATE documentos_recibidos SET estado = 'Rechazado', tipo_acuse = 'rechazo', fecha_aceptacion = ?, mensaje_acuse = 'El hotel no hizo este pedido.' WHERE clave = ?`, args: [ahora, rech.clave] });

  // Compra física (papel): sin certificador ni número de autorización
  await guardarCompra(db, {
    clave: '', tipo: 'Factura electrónica', tipoDte: 'SCOM', consecutivo: 'A-1543', fechaEmision: '2026-10-07T12:00:00', proveedor: 'Comercial Doña Tere',
    proveedorIdentificacion: '24681350', moneda: 'CRC', tipoCambio: 1, subtotal: 401.79, iva: 48.21, total: 450, totalExento: 0, tarifa: 12,
    lineas: [{ numero: 1, cabys: 'B', detalle: 'Flores para el lobby', cantidad: 1, unidad: 'UNI', precioUnitario: 450, descuento: 0, subtotal: 401.79, tarifa: 12, impuesto: 48.21, total: 450 }],
    tipoCreditoFiscal: 'pleno', origen: 'fisica', emitirAcuse: true, generarAsiento: false,
  });

  // La factura especial emitida queda registrada como compra
  const { rows: fesp } = await db.execute(`SELECT * FROM documentos_emitidos WHERE id = '#31040'`);
  if (fesp[0]) {
    const f = fesp[0];
    const r = await guardarCompra(db, {
      clave: String(f.clave), tipo: 'Factura electrónica de compra', tipoDte: 'FESP', consecutivo: String(f.numero_factura), fechaEmision: String(f.fecha_emision),
      proveedor: String(f.cliente_nombre), proveedorIdentificacion: String(f.receptor_identificacion), moneda: 'CRC', tipoCambio: 1,
      subtotal: Number(f.subtotal), iva: Number(f.iva), total: Number(f.total), tarifa: 12, xml: String(f.xml), origen: 'manual',
      lineas: [{ numero: 1, cabys: 'B', detalle: 'Artesanías de madera para decoración de habitaciones', cantidad: 12, unidad: 'UNI', precioUnitario: 150, descuento: 0,
        subtotal: Number(f.subtotal), tarifa: 12, impuesto: Number(f.iva), total: Number(f.total) }],
      tipoCreditoFiscal: 'pleno', emitirAcuse: true, generarAsiento: false,
    });
    if (r.id) {
      await db.execute({ sql: `UPDATE documentos_emitidos SET compra_id = ? WHERE id = '#31040'`, args: [r.id] });
      await db.execute({ sql: `UPDATE documentos_recibidos SET documento_emitido_id = '#31040' WHERE id = ?`, args: [r.id] });
    }
  }

  // Buzón: dos correos con su DTE, por importar
  const correos: [string, string, string, string][] = [
    ['mail-gt-1', 'Distribuidora Maya <ventas@dimaya.gt>', 'DTE Factura - Distribuidora Maya',
      dteProveedor({ tipo: 'FACT', ...P2, fecha: '2026-10-18T08:00:00-06:00', lineas: [['Jabón líquido para manos (galón)', 'B', 8, 95, true]] })],
    ['mail-gt-2', 'Ferretería El Martillo <fel@elmartillo.com.gt>', 'Su factura electrónica FEL',
      dteProveedor({ tipo: 'FACT', ...P1, fecha: '2026-10-19T10:20:00-06:00', lineas: [['Focos LED 12 W', 'B', 24, 28, true]] })],
  ];
  for (const [id, de, asunto, xml] of correos) {
    await db.execute({
      sql: `INSERT INTO correos (id, remitente, asunto, snippet, fecha, favorito, leido, tiene_adjunto_xml, importado, xml, xml_nombre, message_id, origen)
            VALUES (?, ?, ?, 'Adjuntamos el DTE certificado en XML y PDF.', ?, 0, 0, 1, 0, ?, ?, ?, 'imap')`,
      args: [id, de, asunto, new Date().toISOString().slice(0, 10), xml, id + '.xml', `<${id}@demo>`],
    });
  }
}

export async function sembrarEjemplosGT(db: Client) {
  await borrarEjemplosCR(db);
  await reemplazarTerceros(db);
  await ajustarProductos(db);
  await sembrarVentas(db);
  await sembrarCompras(db);
}
