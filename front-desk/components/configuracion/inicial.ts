// Valores iniciales de Configuración (datos de ejemplo). Para conectar el backend se reemplaza INICIAL por la carga desde la API.
import { CENTROS_COSTO, CUENTAS_OPC, GENERAL, MONEDAS_OPC, type Agente, type Camarera, type Concepto, type CondicionWCI, type Contrato, type CorreoEnviado, type CorreoEspecial, type CuentaCorreo, type Denominacion, type Descuento, type Empresa, type ErrorSync, type Exoneracion, type FolioExterno, type GrupoDisp, type GrupoProd, type Habitacion, type Impresora, type Impuesto, type Mercado, type Moneda, type Nacionalidad, type Rango, type Referidor, type Regimen, type ReporteAuditoria, type ServAgencia, type ServFacturacion, type ServSimple, type Tarifa, type TipoCobro, type TipoHab, type TipoTarea } from './datos';
import { EMPRESA_INICIAL } from './inicialEmpresa';

const cuentaBase = (id: string, correo: string): CuentaCorreo => ({
  id, correo, titulo: 'Correo principal del sistema', descripcion: 'Se usa para confirmaciones, facturas y avisos automáticos.',
  servidor: 'smtp.gmail.com', remitente: 'Hotel Seven Suite', usuario: correo, contrasena: '', puerto: '587', firma: 'Recepción · Hotel Seven Suite',
  ssl: true, auth: true, oauth: false, cuenta: '', clienteId: '', secreto: '', responderA: 'reservas@hotelsevensuit.com', copiarA: '', asunto: '', cuerpo: '',
  asuntoReserva: 'Confirmación de su reserva',
});

const conceptoBase = (id: string, descripcion: string, agrupadoEn: string): Concepto => ({
  id, descripcion, activo: true, agrupadoEn, codigoTributario: '6311100000000',
  monedas: [
    { id: id + 'u', moneda: 'USD - Dólar Americano', ctaProduccion: CUENTAS_OPC[0], ctaCasa: CUENTAS_OPC[0] },
    { id: id + 'c', moneda: 'CRC - Colón Costarricense', ctaProduccion: CUENTAS_OPC[0], ctaCasa: CUENTAS_OPC[0] },
  ],
});
export const conceptos = (pref: string, agrup: string, nombres: string[]) => nombres.map((n, i) => conceptoBase(`${pref}${i}`, n, agrup));

const tarifaBase = (id: string, nombre: string, precio: number | null, activo = true): Tarifa => ({
  id, nombre, activo, moneda: 'USD - Dólar Americano',
  base: { t1: precio, t2: precio, t3: precio, t4: precio === null ? null : precio + 40, t5: precio === null ? null : precio + 60 },
  derivaDe: null, metodo: 'Porcentaje', ajusteImporte: 0, ajustePct: 0,
  extras: { derivar: false, tipo: 'Importe', importe: 0, pct: 0, adulto: 35, nino: 20 },
  restricciones: { estMin: 1, estMax: 30 },
});

export const INICIAL = {
  general: GENERAL,
  ...EMPRESA_INICIAL,
  cuentasCorreo: [cuentaBase('c1', 'correo@gmail.com'), { ...cuentaBase('c2', 'correo12345@gmail.com'), titulo: 'Facturación electrónica', remitente: 'Facturación Seven Suite' }] as CuentaCorreo[],
  correosEspeciales: [
    { id: 'e1', nombre: 'Confirmación de reserva', disparador: 'Al crear o confirmar una reserva', activo: true, remitente: 'correo@gmail.com', responderA: 'reservas@hotelsevensuit.com', copiarA: '', asunto: 'Su reserva {numero} está confirmada', cuerpo: 'Hola {huesped},\n\nGracias por elegirnos. Le esperamos el {llegada}.' },
    { id: 'e2', nombre: 'Recordatorio de llegada', disparador: '48 horas antes del check-in', activo: true, remitente: 'correo@gmail.com', responderA: '', copiarA: '', asunto: 'Le esperamos pronto', cuerpo: '' },
    { id: 'e3', nombre: 'Envío de factura', disparador: 'Al cerrar el folio en check-out', activo: true, remitente: 'correo12345@gmail.com', responderA: '', copiarA: 'contabilidad@hotelsevensuit.com', asunto: 'Factura electrónica {factura}', cuerpo: '' },
    { id: 'e4', nombre: 'Cancelación de reserva', disparador: 'Al cancelar una reserva', activo: false, remitente: 'correo@gmail.com', responderA: '', copiarA: '', asunto: 'Cancelación de su reserva {numero}', cuerpo: '' },
  ] as CorreoEspecial[],
  historicoCorreos: [
    { id: 'h1', correo: 'maria.solis@gmail.com', remitente: 'correo@gmail.com', mensaje: 'Su reserva 4198 está confirmada', fecha: '2026-10-06', estado: 'Enviado' },
    { id: 'h2', correo: 'jwilliams@outlook.com', remitente: 'correo@gmail.com', mensaje: 'Le esperamos pronto', fecha: '2026-10-05', estado: 'Enviado' },
    { id: 'h3', correo: 'ventas02@corporacioncsb.com', remitente: 'correo12345@gmail.com', mensaje: 'Factura electrónica 00100001010000004512', fecha: '2026-10-05', estado: 'Enviado' },
    { id: 'h4', correo: 'reservas@aratours.cr', remitente: 'correo@gmail.com', mensaje: 'Su reserva 4190 está confirmada', fecha: '2026-10-04', estado: 'Fallido' },
    { id: 'h5', correo: 'p.hidalgo@yahoo.com', remitente: 'correo@gmail.com', mensaje: 'Le esperamos pronto', fecha: '2026-10-03', estado: 'Enviado' },
  ] as CorreoEnviado[],
  impresoras: [
    { id: 'i1', nombre: 'Recepción principal', ubicacion: 'Front Desk', tipo: 'Láser', papel: 'Letter', activa: true },
    { id: 'i2', nombre: 'Tiquetes de caja', ubicacion: 'Caja 1', tipo: 'Térmica 80 mm', papel: 'Rollo 80 mm', activa: true },
    { id: 'i3', nombre: 'Ama de llaves', ubicacion: 'Oficina ama de llaves', tipo: 'Láser', papel: 'Letter', activa: false },
  ] as Impresora[],

  caracteristicas: ['CAMA DOBLE', 'CAMA KING', 'CAMA QUEEN', '2 CAMAS MATRIMONIALES', '2 CAMAS QUEEN', 'SILLÓN RECLINABLE', 'MINIBAR', 'AIRE ACONDICIONADO',
    'CAJA DE SEGURIDAD', 'LAVABO', 'VENTANAS ANTI RUIDO', 'SERVICIO DE HABITACIÓN', 'PISO ALTO', 'BAÑO PRIVADO', 'SALA DE ESTAR'],
  habitaciones: [
    { id: 'h100', codigo: '100', tipo: 'Standard Casoña 2 Camas', servicio: 'Hospedaje en habitación', caracteristicas: ['2 CAMAS MATRIMONIALES'], centroCosto: CENTROS_COSTO[0], adultos: 3, ninos: 1, pax: 4, color: '#4CAF50' },
    { id: 'h200', codigo: '200', tipo: 'Estándar', servicio: 'Hospedaje en habitación', caracteristicas: ['2 CAMAS MATRIMONIALES'], centroCosto: CENTROS_COSTO[0], adultos: 2, ninos: 0, pax: 2, color: '#EEB300' },
    { id: 'h300', codigo: '300', tipo: 'Superior 2 Camas Queen', servicio: 'Hospedaje en habitación', caracteristicas: ['2 CAMAS QUEEN'], centroCosto: CENTROS_COSTO[0], adultos: 2, ninos: 2, pax: 4, color: '#1984D9' },
    { id: 'h400', codigo: '400', tipo: 'Legacy Suite Camas King', servicio: 'Hospedaje en habitación', caracteristicas: ['CAMA KING'], centroCosto: CENTROS_COSTO[0], adultos: 2, ninos: 1, pax: 3, color: '#FFFFFF' },
    { id: 'h500', codigo: '500', tipo: 'Cabaña', servicio: 'Hospedaje en habitación', caracteristicas: ['2 CAMAS QUEEN'], centroCosto: CENTROS_COSTO[0], adultos: 2, ninos: 1, pax: 3, color: '#FFFFFF' },
    { id: 'h503', codigo: '503', tipo: 'Cabaña 503', servicio: '', caracteristicas: [], centroCosto: '', adultos: 2, ninos: 1, pax: 3, color: '#FFFFFF' },
    { id: 'h504', codigo: '504', tipo: 'Cabaña 504', servicio: '', caracteristicas: [], centroCosto: '', adultos: 2, ninos: 1, pax: 3, color: '#FFFFFF' },
    { id: 'h506', codigo: '506', tipo: 'Cabaña 506', servicio: '', caracteristicas: [], centroCosto: '', adultos: 2, ninos: 1, pax: 3, color: '#FFFFFF' },
  ] as Habitacion[],
  gruposDisp: [
    { id: 'g1', nombre: 'Hotel', orden: 0, habitaciones: ['100', '200', '300', '400', '500'] },
    { id: 'g2', nombre: 'Prueba', orden: 1, habitaciones: ['200'] },
    { id: 'g3', nombre: 'Cabañas', orden: 2, habitaciones: ['503', '504', '506'] },
  ] as GrupoDisp[],
  regimenes: [
    { id: 'r1', codigo: '1BB', descripcion: 'Desayuno', concepto: 'Desayuno', tipo: 'Diario', moneda: MONEDAS_OPC[0], precio: 0 },
    { id: 'r2', codigo: '5PC', descripcion: 'Pensión Completa', concepto: '', tipo: 'Primera noche', moneda: MONEDAS_OPC[0], precio: 0 },
    { id: 'r3', codigo: '5HP', descripcion: 'Media Pensión', concepto: '', tipo: '', moneda: MONEDAS_OPC[0], precio: 0 },
    { id: 'r4', codigo: '7PARR', descripcion: 'Parrillada Guanacasteca', concepto: '', tipo: '', moneda: MONEDAS_OPC[0], precio: 0 },
    { id: 'r5', codigo: '4PIA', descripcion: 'Pen Almuerzo + 3 Cenas', concepto: '', tipo: '', moneda: MONEDAS_OPC[0], precio: 0 },
  ] as Regimen[],

  empresas: [
    { id: 'em1', descripcion: 'Agencias', directo: false, color: '#4CAF50' },
    { id: 'em2', descripcion: 'Amadeus', directo: true, color: '#EEB300' },
    { id: 'em3', descripcion: 'Booking', directo: false, color: '#1984D9' },
    { id: 'em4', descripcion: 'Corporativo', directo: false, color: '#FFFFFF' },
    { id: 'em5', descripcion: 'Costa Rica Vacations', directo: false, color: '#FFFFFF' },
  ] as Empresa[],
  mercados: ['Agencias', 'Agencias Complementary (CPL)', 'Corporativo', 'Incentivos', "OTA's"].map((d, i) => ({ id: 'm' + i, descripcion: d })) as Mercado[],
  agentes: [
    { id: 'a1', nombre: 'Diego Montero Quirós', telefono: '', celular: '8888 8888', correo: 'corporate.sales@corporacioncsb.com' },
    { id: 'a2', nombre: 'Isis Suárez Delgado', telefono: '', celular: '8888 8888', correo: 'ventas02@corporacioncsb.com' },
    { id: 'a3', nombre: 'Jackelin Hernández Aguilar', telefono: '', celular: '8888 8888', correo: 'jefe.reservas@corporacioncsb.com' },
    { id: 'a4', nombre: 'María Castillo', telefono: '', celular: '8888 8888', correo: 'ventas09@corporacioncsb.com' },
  ] as Agente[],
  referidores: [{ id: 'rf1', descripcion: 'Diego Montero Quirós' }, { id: 'rf2', descripcion: 'TripAdvisor' }, { id: 'rf3', descripcion: 'Recomendación de huésped' }] as Referidor[],
  contratos: [
    { id: 'k1', nombre: 'Agencias Tarifa Fits | 2025-2026', empresa: 'Agencias', mercado: 'Agencias', desde: '2025-11-01', hasta: '2026-10-31', cupos: 10, release: 7, tarifa: 'Agencias Tarifa Fits | 2025-2026', activo: true },
    { id: 'k2', nombre: 'Ara Tours Fits 26', empresa: 'Agencias', mercado: 'Agencias', desde: '2026-01-01', hasta: '2026-12-31', cupos: 4, release: 14, tarifa: 'Ara Tours Fits 26', activo: true },
    { id: 'k3', nombre: 'Costa Rica Vacations', empresa: 'Costa Rica Vacations', mercado: 'Agencias', desde: '2026-01-01', hasta: '2026-12-31', cupos: 6, release: 10, tarifa: 'Costa Rica Vacations', activo: true },
  ] as Contrato[],
  tiposHab: [
    { id: 't1', nombre: 'Family', codigo: '400', base: 2, max: 5 },
    { id: 't2', nombre: 'Family King', codigo: '400K', base: 2, max: 4 },
    { id: 't3', nombre: 'Double', codigo: '300', base: 2, max: 3 },
    { id: 't4', nombre: 'Suite Ocean View Queen', codigo: '500Q', base: 2, max: 4 },
    { id: 't5', nombre: 'Suite Ocean View King', codigo: '500K', base: 2, max: 3 },
  ] as TipoHab[],
  tarifas: [
    tarifaBase('ta1', 'Agencias Tarifa Fits | 2025-2026', 270),
    tarifaBase('ta2', 'Agencias Tarifa Fits | 2025-2026 (Niv. 2)', 252),
    tarifaBase('ta3', 'Ara Tours Fits 26', null),
    tarifaBase('ta4', 'Costa Rica Vacations', 298),
    tarifaBase('ta5', 'CPL', null),
    tarifaBase('ta6', 'Ventas Directas Agentes SBH*', 215),
    tarifaBase('ta7', 'Tarifa Rack', 320),
    { ...tarifaBase('ta8', 'Agencias 15%', null), derivaDe: 'ta7', metodo: 'Porcentaje', ajustePct: -15 },
    tarifaBase('ta9', "OTA'S", 305, false),
  ] as Tarifa[],
  /** Excepciones del tarifario: `${tipo}|${tarifa}|${aaaa-mm-dd}|${vista}` → valor */
  tarifario: {} as Record<string, number | boolean>,

  gruposProd: [
    { id: 'gp1', nombre: 'Hospedaje', conceptos: conceptos('hs', 'Hospedaje', ['HOSPEDAJE HAB FAMILY', 'HOSPEDAJE HAB SUPERIOR', 'HOSPEDAJE GULF VIEW']) },
    { id: 'gp2', nombre: 'A&B', conceptos: conceptos('ab', 'A&B', ['REST. LA HACIENDA ALIMENTOS', 'REST. LA HACIENDA BEBIDAS', 'BAR PISCINA', 'DESAYUNO', 'SERVICIO A LA HABITACIÓN']) },
    { id: 'gp3', nombre: 'Tours', conceptos: conceptos('tr', 'Tours', ['ADVENTURE TOURS', 'CANOPY', 'TRANSPORTE AEROPUERTO', 'TOUR VOLCÁN', 'SURF LESSONS']) },
    { id: 'gp4', nombre: 'Otros servicios', conceptos: conceptos('ot', 'Otros servicios', ['LAVANDERÍA', 'SPA', 'TELÉFONO', 'PARQUEO']) },
  ] as GrupoProd[],
  serviciosFact: [
    { id: 's1', nombre: 'Restaurante exonerado', codigo: 'ABX', concepto: 'REST. LA HACIENDA ALIMENTOS', precios: [{ id: 'p1', moneda: MONEDAS_OPC[0], precio: 0 }, { id: 'p2', moneda: MONEDAS_OPC[1], precio: 0 }], impuestos: ['im3', 'im6'], descuentos: ['d1'] },
    { id: 's2', nombre: 'Adulto adicional', codigo: 'ADA', concepto: 'HOSPEDAJE HAB FAMILY', precios: [{ id: 'p3', moneda: MONEDAS_OPC[0], precio: 35 }], impuestos: ['im3'], descuentos: [] },
    { id: 's3', nombre: 'Dep Adelanto Efectivo', codigo: 'ADE', concepto: '', precios: [], impuestos: [], descuentos: [] },
    { id: 's4', nombre: 'Dep Adelanto Tarjeta', codigo: 'ADT', concepto: '', precios: [], impuestos: [], descuentos: [] },
    { id: 's5', nombre: 'Adventure Tours', codigo: 'ADV', concepto: 'ADVENTURE TOURS', precios: [{ id: 'p4', moneda: MONEDAS_OPC[0], precio: 85 }], impuestos: ['im3'], descuentos: [] },
  ] as ServFacturacion[],
  serviciosAgencia: [
    { id: 'sa1', codigo: '100_1A0N', nombre: 'HAB ES 1A0N', uso: '100', regimen: '1BB', tipo: 'Diario', impuestos: ['im3', 'im6'] },
    { id: 'sa2', codigo: '100_1A1N', nombre: 'HAB ES 1A1N', uso: '100', regimen: '1BB', tipo: 'Diario', impuestos: ['im3', 'im6'] },
    { id: 'sa3', codigo: '100_2A0N', nombre: 'HAB ES 2A0N', uso: '100', regimen: '1BB', tipo: 'Diario', impuestos: ['im3'] },
    { id: 'sa4', codigo: '100_2A1N', nombre: 'HAB ES 2A1N', uso: '100', regimen: '5HP', tipo: 'Diario', impuestos: ['im3'] },
  ] as ServAgencia[],
  serviciosSimples: [
    { id: 'ss1', codigo: 'ABC', descripcion: 'Servicio a la habitación', tipo: 'Alojamiento', concepto: 'SERVICIO A LA HABITACIÓN', modo: 'Precio', moneda: MONEDAS_OPC[0], precio: 0, porcentaje: 0 },
    { id: 'ss2', codigo: 'DCS', descripcion: 'Servicio de transporte grupal', tipo: 'Transporte', concepto: 'TRANSPORTE AEROPUERTO', modo: 'Porcentaje', moneda: MONEDAS_OPC[0], precio: 0, porcentaje: 1 },
  ] as ServSimple[],
  tiposCobro: [
    { id: 'tc1', codigo: 'CASH_BACK', descripcion: 'CASH_BACK', moneda: MONEDAS_OPC[0], tipo: 'Cuenta crédito', detallado: false, ctaFija: false, digitosTC: '', comision: 0, terminal: '', cuenta: '', cuentaPropinas: '' },
    { id: 'tc2', codigo: 'CC_DOL', descripcion: 'CUENTA CASA DOLARES', moneda: MONEDAS_OPC[0], tipo: 'Crédito habitación', detallado: false, ctaFija: false, digitosTC: '', comision: 0, terminal: '', cuenta: '', cuentaPropinas: '' },
    { id: 'tc3', codigo: 'CRED_INT$', descripcion: 'CRÉDITO INTERNO DÓLARES', moneda: MONEDAS_OPC[0], tipo: 'Crédito interno', detallado: false, ctaFija: false, digitosTC: '', comision: 0, terminal: '', cuenta: '', cuentaPropinas: '' },
    { id: 'tc4', codigo: 'CRED_INT¢', descripcion: 'CRÉDITO INTERNO COLONES', moneda: MONEDAS_OPC[1], tipo: 'Crédito interno', detallado: false, ctaFija: false, digitosTC: '', comision: 0, terminal: '', cuenta: '', cuentaPropinas: '' },
    { id: 'tc5', codigo: 'VISA', descripcion: 'TARJETA VISA', moneda: MONEDAS_OPC[0], tipo: 'Tarjeta de crédito', detallado: true, ctaFija: false, digitosTC: '4', comision: 3.5, terminal: 'BAC Credomatic', cuenta: CUENTAS_OPC[3], cuentaPropinas: '' },
  ] as TipoCobro[],
  impuestos: [
    { id: 'im1', descripcion: 'IVA 0%', porcentaje: 0, nivel: 1, moneda: MONEDAS_OPC[0], cuenta: CUENTAS_OPC[0], canje: false, apSup: false },
    { id: 'im2', descripcion: 'IVA 1%', porcentaje: 1, nivel: 1, moneda: MONEDAS_OPC[0], cuenta: CUENTAS_OPC[0], canje: false, apSup: false },
    { id: 'im3', descripcion: 'IVA 13%', porcentaje: 13, nivel: 2, moneda: MONEDAS_OPC[0], cuenta: CUENTAS_OPC[0], canje: false, apSup: false },
    { id: 'im4', descripcion: 'IVA 2%', porcentaje: 2, nivel: 1, moneda: MONEDAS_OPC[0], cuenta: CUENTAS_OPC[0], canje: false, apSup: false },
    { id: 'im5', descripcion: 'IVA 4%', porcentaje: 4, nivel: 1, moneda: MONEDAS_OPC[0], cuenta: CUENTAS_OPC[0], canje: false, apSup: false },
    { id: 'im6', descripcion: 'Servicios', porcentaje: 10, nivel: 1, moneda: MONEDAS_OPC[1], cuenta: CUENTAS_OPC[0], canje: false, apSup: false },
  ] as Impuesto[],
  exoneraciones: ['Compras Autorizadas', 'Ventas Exentas a Diplomáticos', 'Orden de Compra (Instituciones Públicas y Otros Organismos)', 'Exenciones Dirección General de Hacienda', 'Zonas Francas', 'Otros']
    .map((d, i) => ({ id: 'ex' + i, descripcion: d })) as Exoneracion[],
  descuentos: [
    { id: 'd1', descripcion: 'Descuento 10% / Especial', porcentaje: 10, moneda: MONEDAS_OPC[0], tipo: 'Punto de Venta', cuenta: CUENTAS_OPC[0], contrasena: 'Hotel123', visible: true },
    { id: 'd2', descripcion: 'Descuento 15% / 15% Off', porcentaje: 15, moneda: MONEDAS_OPC[0], tipo: 'Punto de Venta', cuenta: CUENTAS_OPC[0], contrasena: 'Hotel123', visible: true },
    { id: 'd3', descripcion: 'Descuento 5% / 5% Off', porcentaje: 5, moneda: MONEDAS_OPC[0], tipo: 'Punto de Venta', cuenta: CUENTAS_OPC[0], contrasena: 'Hotel123', visible: false },
  ] as Descuento[],
  foliosExternos: [
    { id: 'fe1', codigo: '1', descripcion: 'Clientes externos', ctaCasa: false, canje: false, inactFact: false, moneda: MONEDAS_OPC[0], proxTarj: 29, limite: 0, descuento: '', cuenta: '', impuesto: '' },
    { id: 'fe2', codigo: '2', descripcion: 'Clientes externos exonerados', ctaCasa: false, canje: false, inactFact: false, moneda: MONEDAS_OPC[0], proxTarj: 1, limite: 0, descuento: '', cuenta: '', impuesto: '' },
    { id: 'fe3', codigo: '3', descripcion: 'Clientes externos dólares', ctaCasa: false, canje: false, inactFact: false, moneda: MONEDAS_OPC[0], proxTarj: 28, limite: 0, descuento: '', cuenta: '', impuesto: '' },
    { id: 'fe4', codigo: '4', descripcion: 'Cuenta casa $', ctaCasa: true, canje: false, inactFact: false, moneda: MONEDAS_OPC[1], proxTarj: 11, limite: 0, descuento: '', cuenta: '', impuesto: '' },
  ] as FolioExterno[],

  tiposTarea: ['Ama de llaves', 'Mantenimiento', 'Transporte', 'Servicio al cliente'].map((d, i) => ({ id: 'tt' + i, descripcion: d })) as TipoTarea[],
  monedas: [
    { id: 'mo1', codigo: 'CRC', descripcion: 'Colón Costarricense', simbolo: '₡', comision: 0, decimales: 2, convertible: true, facturable: true, referencia: true, activo: true, empresa: '100 - Hotel', depAdelantados: 'ADE - DEP ADELANTADO EFECTIVO', pagoParcial: 'ADT - DEP ADELANTADO TARJETA' },
    { id: 'mo2', codigo: 'USD', descripcion: 'Dólar Americano', simbolo: '$', comision: 0, decimales: 2, convertible: false, facturable: false, referencia: false, activo: true, empresa: '100 - Hotel', depAdelantados: 'ADE - DEP ADELANTADO EFECTIVO', pagoParcial: 'ADT - DEP ADELANTADO TARJETA' },
    { id: 'mo3', codigo: 'EUR', descripcion: 'Euro', simbolo: '€', comision: 0, decimales: 2, convertible: true, facturable: false, referencia: false, activo: true, empresa: '100 - Hotel', depAdelantados: '', pagoParcial: '' },
  ] as Moneda[],
  nacionalidades: [
    ['ALB', 'Albania', 'Albanés'], ['ALE', 'Alemania', 'Alemán'], ['ANT', 'Antigua y Barbuda', 'Inglés'], ['ARA', 'Arabia Saudita', 'Árabe'],
    ['ARG', 'Argentina', 'Español'], ['AUS', 'Australia', 'Inglés'], ['BRA', 'Brasil', 'Portugués'], ['CAN', 'Canadá', 'Inglés'],
    ['CRI', 'Costa Rica', 'Español'], ['ESP', 'España', 'Español'], ['EUA', 'Estados Unidos', 'Inglés'], ['FRA', 'Francia', 'Francés'],
    ['ITA', 'Italia', 'Italiano'], ['MEX', 'México', 'Español'], ['NIC', 'Nicaragua', 'Español'], ['PAN', 'Panamá', 'Español'],
  ].map(([codigo, pais, idioma], i) => ({ id: 'n' + i, codigo, pais, idioma, activo: true })) as Nacionalidad[],
  camareras: [
    { id: 'ca1', nombre: 'Ana Luisa Ramírez', activo: true },
    { id: 'ca2', nombre: 'Graciela Pérez', activo: true },
    { id: 'ca4', nombre: 'Rosa Elena Mora', activo: true },
    { id: 'ca3', nombre: 'Pilar Hidalgo', activo: false },
  ] as Camarera[],
  rangos: [
    { id: 'rg1', codigo: '01', descripcion: 'Superiores', habitaciones: ['205', '214', '215', '217', '218', '219', '220', '221', '222', '223', '224', '225'], activo: true },
    { id: 'rg2', codigo: '02', descripcion: 'Standard', habitaciones: ['201', '202', '203', '204'], activo: true },
    { id: 'rg3', codigo: '03', descripcion: 'Junior Suite', habitaciones: ['206', '207', '208', '209', '210', '211', '212', '213'], activo: true },
    { id: 'rg4', codigo: '04', descripcion: 'Deluxe', habitaciones: ['231', '232', '233'], activo: true },
    { id: 'rg5', codigo: '05', descripcion: '2 Bedroom Suite', habitaciones: ['236', '237', '238', '239', '240'], activo: false },
  ] as Rango[],

  caja: {
    modalidad: 'variable' as 'fijo' | 'variable',
    montoUSD: 500, montoCRC: 260000,
    detallar: true,
    denominaciones: [
      { id: 'u100', moneda: 'USD', valor: 100, cantidad: 2 }, { id: 'u50', moneda: 'USD', valor: 50, cantidad: 2 }, { id: 'u20', moneda: 'USD', valor: 20, cantidad: 5 },
      { id: 'u10', moneda: 'USD', valor: 10, cantidad: 0 }, { id: 'u5', moneda: 'USD', valor: 5, cantidad: 5 }, { id: 'u1', moneda: 'USD', valor: 1, cantidad: 25 },
      { id: 'c10k', moneda: 'CRC', valor: 10000, cantidad: 10 }, { id: 'c5k', moneda: 'CRC', valor: 5000, cantidad: 20 }, { id: 'c2k', moneda: 'CRC', valor: 2000, cantidad: 25 },
    ] as Denominacion[],
    firma: 'ambos' as 'trazo' | 'pin' | 'ambos',
    permisos: {
      'Anular recibos y facturas': true, 'Reabrir un turno cerrado': true, 'Retiros parciales de efectivo': false,
      'Reimprimir cierre de turno': false, 'Cambiar tipo de cambio en caja': true,
    } as Record<string, boolean>,
  },
  cierre: {
    diasMantener: 360, fechaUltimo: '2025-06-14', diasAlerta: 3, copias: 1,
    asientos: { automaticos: true, integrados: false },
    adicionales: {
      'Cobrar dep. adelantado No Show': false, 'Cobrar dep. adelantado Cultura': false, 'Poner todas las hab. limpias': false,
      'No permitir cierre si hay preauditoría': false, 'Incluir estadísticas del proveniente': false, 'Habilitar monedas automáticamente': false,
    } as Record<string, boolean>,
    reportes: [
      ['Preauditoría Nocturna', 'PREAUD', 10, true], ['Listado Rack de Habitaciones', 'LOHAB', 12, true], ['Listado Rack Clientes Local', 'LOCL', 8, true],
      ['Listado Rack Clientes Nacional', 'LONATO', 7, true], ['Listado Rack Habs. por Régimen', 'LOREHA', 6, true], ['Salidas en Pick', 'LOSAPI', 5, false],
      ['Check-in en Proceso', 'LOCHPR', 4, false],
    ].map(([descripcion, codigo, orden, activa], i) => ({ id: 'ra' + i, descripcion, codigo, orden, activa, sistema1: false, sistema2: false, obligatoria: i < 2, reporte: true })) as ReporteAuditoria[],
  },
  webCheckin: {
    apiUrl: 'https://node.myhotelpeak.com', token: '019ca18c-da6b-7209-8642-7c5d29888f44', cliente: '16', primerCorreo: 72, recordatorio: 24,
    direccion: '',
    obligatorios: {
      'Huésped principal': { 'Nombre y apellidos': true, 'Correo electrónico': true, 'Identificación': true, 'Número de teléfono': false, 'Código postal': false },
      'Dirección del huésped': { 'País': true, 'Ciudad': true, 'Dirección': false, 'Código postal': false },
      'Adicionales': { 'Nombre completo': false, 'Identificación': false },
      'Contacto de emergencia': { 'Nombre completo': false, 'Número de teléfono': false },
    } as Record<string, Record<string, boolean>>,
    placa: false, horaSalida: { activo: true, hora: '11:00' }, horaEntrada: { activo: false, hora: '14:00' },
    colorPrincipal: '#213C89', colorSecundario: '#F2F7FE', logo: '' as string, logoNombre: '' as string,
    usarCondiciones: true,
    condiciones: [
      { id: 'w1', texto: 'Yo autorizo al hotel a usar mi tarjeta para cubrir incidentes y/o gastos durante mi estadía. Autorizo el uso de mis medios de contacto (email, teléfono) para el envío de información estrictamente comercial.' },
      { id: 'w2', texto: 'NO SE PERMITEN MASCOTAS / NO PETS ALLOWED' },
    ] as CondicionWCI[],
    errores: [
      { id: 'er1', fecha: '2026-10-06', descripcion: 'Reserva 4198: el huésped no tiene identificación; no se pudo crear el perfil en el PMS.', leido: false },
      { id: 'er2', fecha: '2026-10-05', descripcion: 'Timeout al consultar disponibilidad (node.myhotelpeak.com respondió en 30 s).', leido: false },
      { id: 'er3', fecha: '2026-10-02', descripcion: 'Token inválido: se regeneró y se reintentó la sincronización.', leido: true },
    ] as ErrorSync[],
  },
  dega: { activo: false, url: '', usuario: '', clave: '', sucursal: '', terminal: '' },
};

export type Datos = typeof INICIAL;
