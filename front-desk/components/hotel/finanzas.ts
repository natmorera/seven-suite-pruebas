// ─────────────────────────────────────────────────────────────────────────────
// Datos de Facturación (canjes, caja y turnos, folios, depósitos, facturas y
// vouchers). Viven en el mismo store que el resto de Front Desk (useHotel), así
// que un pago en un folio aparece en la caja del cajero, en vouchers y en las
// transacciones del día. Los datos de ejemplo están en semillaFinanzas.ts.
// Al conectar la API, cada acción de accionesFinanzas.ts pasa a ser una llamada.
// ─────────────────────────────────────────────────────────────────────────────
import { INICIAL } from '@/components/configuracion/inicial';
import { HOY, noches, sumarDias, type Reserva } from './datos';

export const pad = (n: number) => String(n).padStart(2, '0');
/** Hora real del equipo (solo en eventos/efectos, nunca durante el render). */
export const horaReal = () => { const d = new Date(); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
/** Fecha hotelera + hora real: «2026-10-06T07:35». */
export const ahoraHotel = () => `${HOY}T${horaReal()}`;
export const fmtFH = (iso?: string | null) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)} ${iso.slice(11, 16)}` : '—');
export const minutosEntre = (a: string, b: string) => Math.round((new Date(b).getTime() - new Date(a).getTime()) / 60000);
export const fmtDuracion = (min: number) => `${Math.floor(Math.max(0, min) / 60)}h ${pad(Math.max(0, min) % 60)}min`;
export const r2 = (n: number) => Math.round(n * 100) / 100;

// ── Monedas (Configuración › Parámetros generales › Monedas y Tipo de cambio) ─
export type Mon = 'USD' | 'CRC' | 'EUR';
/** Tasa vigente (colones por unidad) de cada divisa: el registro más reciente de Tipo de cambio. */
const colonesPor = (codigo: string) => [...INICIAL.tiposCambio].filter(t => t.moneda === codigo).sort((a, b) => b.fecha.localeCompare(a.fecha))[0]?.tasa ?? 1;
const unidadesPorUSD = (codigo: string) => (codigo === 'USD' ? 1 : codigo === 'CRC' ? colonesPor('USD') : colonesPor('USD') / colonesPor(codigo));
export const MONEDAS: { codigo: Mon; nombre: string; simbolo: string; porUSD: number }[] = INICIAL.monedas
  .filter(m => m.activo && ['USD', 'CRC', 'EUR'].includes(m.codigo))
  .map(m => ({ codigo: m.codigo as Mon, nombre: m.descripcion, simbolo: m.simbolo, porUSD: unidadesPorUSD(m.codigo) }))
  .sort((a, b) => (a.codigo === 'USD' ? -1 : b.codigo === 'USD' ? 1 : a.codigo.localeCompare(b.codigo)));
const porUSD = (m: Mon) => MONEDAS.find(x => x.codigo === m)?.porUSD ?? 1;
/** Tipo de cambio BCCR del día (colones por dólar). */
export const TC = porUSD('CRC');
export const aUSD = (monto: number, m: Mon) => monto / porUSD(m);
export const deUSD = (usd: number, m: Mon) => usd * porUSD(m);
/** Tasa para convertir de una moneda a otra (1 unidad de `de` = tasa unidades de `a`). */
export const tasaCruce = (de: Mon, a: Mon) => porUSD(a) / porUSD(de);
export const simbolo = (m: string) => MONEDAS.find(x => x.codigo === m)?.simbolo ?? '$';
export const nombreMoneda = (m: string) => MONEDAS.find(x => x.codigo === m)?.nombre ?? m;
const num = (n: number, d = 2) => {
  const [i, dec = ''] = Math.abs(n).toFixed(d).split('.');
  return (n < 0 && Math.abs(n) >= 0.005 ? '-' : '') + i.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + (d ? '.' + dec : '');
};
export const fmtN = num;
/** «$ 1,234.00», «₡ 50,000.00», «-$ 15.00» */
export const fmtMon = (n: number, m: string = 'USD') => `${n < 0 && Math.abs(n) >= 0.005 ? '-' : ''}${simbolo(m)} ${num(Math.abs(n))}`;
/** «$1,985.00», sin espacio (KPIs de caja). */
export const fmtUSD = (n: number, signo = false) => `${n < 0 && Math.abs(n) >= 0.005 ? '−' : signo && n > 0 ? '+' : ''}$${num(Math.abs(n))}`;
export const fmtCRC = (n: number) => `₡${num(n, 0)}`;

// ── Conceptos de cargo (código, grupo de producción e impuesto) ──────────────
export interface ConceptoFact { codigo: string; descripcion: string; grupo: string; iva: number }
export const CONCEPTOS: ConceptoFact[] = [
  { codigo: 'HOSP', descripcion: 'Hospedaje', grupo: 'HOSPEDAJE', iva: 13 },
  { codigo: 'BB', descripcion: 'Desayuno', grupo: 'DESAYUNO INCLUIDO', iva: 13 },
  { codigo: 'DESI', descripcion: 'Desayuno incluido', grupo: 'DESAYUNO INCLUIDO', iva: 13 },
  { codigo: 'ALM', descripcion: 'Almuerzo', grupo: 'REST. LA HACIENDA ALIMENTOS', iva: 13 },
  { codigo: 'ALK', descripcion: 'Almuerzo niño', grupo: 'REST. LA HACIENDA ALIMENTOS', iva: 13 },
  { codigo: 'APQ', descripcion: 'Almuerzo paquete', grupo: 'REST. LA HACIENDA ALIMENTOS', iva: 13 },
  { codigo: 'BOX', descripcion: 'Box lunch', grupo: 'REST. LA HACIENDA ALIMENTOS', iva: 13 },
  { codigo: 'ABX', descripcion: 'ABX - Restaurante exonerado', grupo: 'REST. LA HACIENDA ALIMENTOS', iva: 0 },
  { codigo: 'BCNBY', descripcion: 'Bar canopy bebidas', grupo: 'BAR Y BEBIDAS', iva: 13 },
  { codigo: 'MINI', descripcion: 'Minibar', grupo: 'BAR Y BEBIDAS', iva: 13 },
  { codigo: 'LAV', descripcion: 'Lavandería hotel', grupo: 'OTROS SERVICIOS', iva: 13 },
  { codigo: 'SPA', descripcion: 'Spa', grupo: 'OTROS SERVICIOS', iva: 13 },
  { codigo: 'PARQ', descripcion: 'Parqueo', grupo: 'OTROS SERVICIOS', iva: 13 },
  { codigo: 'ALQ', descripcion: 'Alquileres', grupo: 'OTROS SERVICIOS', iva: 13 },
  { codigo: 'TOUR', descripcion: 'Tour volcán', grupo: 'TOURS', iva: 13 },
  { codigo: 'TRA', descripcion: 'Transporte aeropuerto', grupo: 'TOURS', iva: 13 },
  { codigo: 'DESC', descripcion: 'Descuento', grupo: 'HOSPEDAJE', iva: 13 },
];
const ALIAS: Record<string, string> = { 'Desayuno buffet': 'BB', 'Parqueo': 'PARQ', 'Minibar': 'MINI', 'Lavandería': 'LAV', 'Spa': 'SPA', 'Tour volcán': 'TOUR', 'Transporte aeropuerto': 'TRA' };
export const conceptoDe = (x: string): ConceptoFact =>
  CONCEPTOS.find(c => c.codigo === x || c.descripcion === x || c.codigo === ALIAS[x]) ?? { codigo: x.slice(0, 5).toUpperCase(), descripcion: x, grupo: 'OTROS SERVICIOS', iva: 13 };
/** Separa un importe con impuestos incluidos en producción + impuesto. */
export const desglose = (importe: number, codigo: string) => {
  const iva = conceptoDe(codigo).iva;
  const prod = r2(importe / (1 + iva / 100));
  return { produccion: prod, impuestos: r2(importe - prod) };
};

// ── Caja ─────────────────────────────────────────────────────────────────────
export type Rol = 'Responsable' | 'Regular' | 'Administrador';
export interface Cajero { nombre: string; usuario: string; rol: Rol; horario: string; pin: string }
/** Usuarios de caja (en el backend vendrán de Seguridad). PIN de prueba: 1234. */
export const CAJEROS: Cajero[] = [
  { nombre: 'José Gregorio Gil', usuario: 'jose.gil', rol: 'Responsable', horario: '06:00 – 14:00', pin: '1234' },
  { nombre: 'María Rodríguez', usuario: 'maria.rodriguez', rol: 'Regular', horario: '06:00 – 14:00', pin: '1234' },
  { nombre: 'Ana López', usuario: 'ana.lopez', rol: 'Regular', horario: '14:00 – 22:00', pin: '1234' },
  { nombre: 'Carlos Mora', usuario: 'carlos.mora', rol: 'Regular', horario: '00:00 – 06:00', pin: '1234' },
  { nombre: 'Federico Araya', usuario: 'federico.araya', rol: 'Administrador', horario: '—', pin: '1234' },
];
export const cajeroDe = (n: string) => CAJEROS.find(c => c.nombre === n);
export const RESPONSABLE = CAJEROS.find(c => c.rol === 'Responsable')!.nombre;
export const ADMIN = CAJEROS.find(c => c.rol === 'Administrador')!.nombre;

export type Metodo = 'Efectivo' | 'Tarjeta' | 'Transferencia' | 'Link de pago';
export interface MovCaja {
  id: string; turnoId: string; fecha: string; hora: string; concepto: string; referencia: string; cliente: string;
  metodo: Metodo; terminal: string; moneda: Mon; importe: number; usd: number; tipo: 'Ingreso' | 'Egreso'; usuario: string;
}
export const DENOMINACIONES: Record<'USD' | 'CRC', number[]> = { USD: [100, 50, 20, 10, 5, 1], CRC: [50000, 20000, 10000, 5000, 2000, 1000, 500] };
export interface Conteo { USD: Record<string, number>; CRC: Record<string, number> }
export const conteoVacio = (): Conteo => ({ USD: {}, CRC: {} });
export const totalConteo = (c: Conteo | undefined, m: 'USD' | 'CRC') => (c ? DENOMINACIONES[m].reduce((s, d) => s + d * (c[m][d] || 0), 0) : 0);
export const totalConteoUSD = (c?: Conteo) => r2(totalConteo(c, 'USD') + totalConteo(c, 'CRC') / TC);
/** Desglose de billetes para un monto (semilla y fondos fijos). */
export function conteoDe(usd: number, crc: number): Conteo {
  const c = conteoVacio();
  let u = Math.round(usd), k = Math.round(crc / 500) * 500;
  for (const d of DENOMINACIONES.USD) { const n = Math.floor(u / d); if (n) c.USD[d] = n; u -= n * d; }
  for (const d of DENOMINACIONES.CRC) { const n = Math.floor(k / d); if (n) c.CRC[d] = n; k -= n * d; }
  return c;
}
export interface Comprobantes { pos1: number; pos2: number; link: number; transf: number }
export const COMPROBANTES: { k: keyof Comprobantes; metodo: string; detalle: string; moneda: 'USD' | 'CRC'; terminal: string }[] = [
  { k: 'pos1', metodo: 'POS Recepción 1 (BAC)', detalle: 'Tarjetas USD', moneda: 'USD', terminal: 'POS Recepción 1 (BAC)' },
  { k: 'pos2', metodo: 'POS Recepción 2 (BAC)', detalle: 'Tarjetas CRC', moneda: 'CRC', terminal: 'POS Recepción 2 (BAC)' },
  { k: 'link', metodo: 'Link de pago', detalle: 'Cobros online', moneda: 'USD', terminal: 'Link de pago (BAC)' },
  { k: 'transf', metodo: 'Transferencias', detalle: '—', moneda: 'USD', terminal: '' },
];
export const totalComprobantesUSD = (c?: Comprobantes) => (c ? r2(c.pos1 + c.pos2 / TC + c.link + c.transf) : 0);
export const MOTIVOS_DIFERENCIA = ['Error en vuelto dado al huésped', 'Billete falso o dañado', 'Pago no registrado en el sistema', 'Error de digitación en comprobante', 'Otro'];

export interface Turno {
  id: string; cajero: string; fecha: string; inicio: string; fin: string | null;
  saldoInicial: number; conteoApertura?: Conteo; difApertura: number; obsApertura: string; turnoAnterior: string | null;
  precierre: boolean;
  /** Totales al cierre (para turnos históricos sin detalle de movimientos). */
  ingresos?: number; egresos?: number; nMovs?: number;
  conteoCierre?: Conteo; comprobantes?: Comprobantes; efectivoFinal?: number;
  esperado?: number; declarado?: number; diferencia: number; motivo?: string; detalles?: string; observaciones?: string;
  forzado?: boolean; forzadoPor?: string; firmadoPor?: string;
}
export interface CajaDia {
  fecha: string; estado: 'abierta' | 'cerrada'; apertura: string | null; abiertaPor: string;
  ultimaApertura: string; ultimoCierre: string; cerradaPor: string;
  folioCierre: string; observaciones: string; recibidoPor: string;
}
export interface CierreCaja { folio: string; fecha: string; hora: string; firmadoPor: string; recibidoPor: string; observaciones: string; turnos: string[]; ingresos: number; egresos: number; saldoFinal: number; diferencia: number; nMovs: number }

// ── Canjes ───────────────────────────────────────────────────────────────────
export interface Canje {
  id: string; numero: number; fecha: string; perfilId: string | null; nombre: string; habitacion: string; pasaporte: string; reservaId: string | null;
  monedaOrigen: Mon; importeOrigen: number; monedaDestino: Mon; tasa: number; importeDestino: number;
  comisionId: string; comisionPct: number; comision: number; entregado: number; observaciones: string; usuario: string;
}
/** Comisiones preconfiguradas (dato fijo: no se digita, se elige). */
export const COMISIONES_CANJE = [
  { id: 'sin', nombre: 'Sin comisión', pct: 0 },
  { id: 'c1', nombre: 'Comisión huésped (1%)', pct: 1 },
  { id: 'c2', nombre: 'Comisión no huésped (2%)', pct: 2 },
  { id: 'c3', nombre: 'Comisión moneda extranjera (3%)', pct: 3 },
];

// ── Formas de pago ───────────────────────────────────────────────────────────
export interface FormaPago { id: string; nombre: string; metodo: Metodo; moneda: Mon; terminal: string; cuenta: string }
export const FORMAS_PAGO: FormaPago[] = [
  { id: 'EFD', nombre: 'Efectivo dólares', metodo: 'Efectivo', moneda: 'USD', terminal: '', cuenta: 'Caja de cambio - 1001004' },
  { id: 'EFC', nombre: 'Efectivo colones', metodo: 'Efectivo', moneda: 'CRC', terminal: '', cuenta: 'Caja de cambio - 1001004' },
  { id: 'BACD', nombre: 'Dólares BAC', metodo: 'Tarjeta', moneda: 'USD', terminal: 'POS Recepción 1 (BAC)', cuenta: 'BN Tarjetas Dolares - 1201002' },
  { id: 'BACC', nombre: 'Colones BAC', metodo: 'Tarjeta', moneda: 'CRC', terminal: 'POS Recepción 2 (BAC)', cuenta: 'BAC Colones 93591667 - 1102003' },
  { id: 'LINK', nombre: 'Link de pago', metodo: 'Link de pago', moneda: 'USD', terminal: 'Link de pago (BAC)', cuenta: 'BN Tarjetas Dolares - 1201002' },
  { id: 'TRF', nombre: 'Transferencia bancaria', metodo: 'Transferencia', moneda: 'USD', terminal: '', cuenta: 'BAC Dólares 93591675 - 1102004' },
];
export const formaPago = (id: string) => FORMAS_PAGO.find(f => f.id === id) ?? FORMAS_PAGO[0];
export const TERMINALES = ['POS Recepción 1 (BAC)', 'POS Recepción 2 (BAC)', 'Link de pago (BAC)'];

// ── Folios ───────────────────────────────────────────────────────────────────
export type ClaseFolio = 'casa' | 'externo' | 'reserva';
export type TipoMov = 'Cargo' | 'Corrección' | 'Traslado';
export interface MovFolio {
  id: string; fecha: string; hora: string; concepto: string; descripcion: string; origen: string; conceptoOrig: string;
  importe: number; tipo: TipoMov; motivo: string; usuario: string; historico?: boolean; ref?: string;
}
export interface PagoFolio {
  id: string; fecha: string; hora: string; moneda: Mon; forma: string; tasa: number; importe: number; comision: number; descuento: number;
  referencia: string; tarjeta: string; venceTarjeta: string; montoFacturado: number; pendiente: number; incluirDeposito: boolean; usuario: string; historico?: boolean;
}
export interface EventoFolio { id: string; fecha: string; usuario: string; accion: string }
export interface ExoneracionFolio { tipo: string; fecha: string; documento: string; institucion: string; monto: number; tarifa: number }
export interface ReferenciaFolio { tipo: string; folio: string; contingencia: boolean; documento: string; fecha: string; razon: string }
export interface Redireccion { id: string; conceptos: string[]; destino: string; desde: string; hasta: string }
export interface DocFiscal { id: string; tipo: 'Factura' | 'Nota de crédito' | 'Nota de débito'; numero: string; fecha: string; importe: number; motivo: string }
export interface ExtraFolio {
  movs: MovFolio[]; pagos: PagoFolio[]; bitacora: EventoFolio[]; redirecciones: Redireccion[]; documentos: DocFiscal[];
  /** Líneas (incluidas las calculadas de la reserva) ya corregidas o trasladadas. */
  bloqueados: string[];
  exoneracion?: ExoneracionFolio; referencia?: ReferenciaFolio; estado?: 'Abierto' | 'Cerrado';
}
export const extraVacio = (): ExtraFolio => ({ movs: [], pagos: [], bitacora: [], redirecciones: [], documentos: [], bloqueados: [] });
export interface DatosFiscales { activa: boolean; tipoId: string; numeroId: string; razon: string; email: string; actividad: string; direccion: string }
export interface CargoAuto { id: string; servicio: string; desde: string; hasta: string; cantidad: number; precio: number }
export interface FolioCuenta extends ExtraFolio {
  id: string; clase: 'casa' | 'externo'; numero: string; nombre: string; perfilId: string | null; titular: string;
  tipo: string; cuenta: string; emision: string; vencimiento: string; moneda: 'USD' | 'CRC'; limite: number;
  tipoDeposito: string; depGarantia: number; folioCredito: string; formaPago: string;
  tarjeta: { tipo: string; numero: string; vence: string; nombre: string }; cheque: string; direccionEnvio: string; credito: boolean;
  fiscal: DatosFiscales; cargosAuto: CargoAuto[]; estado: 'Abierto' | 'Cerrado'; cierre?: string;
  /** Cuenta adicional creada desde una reserva (Facturación de la reserva › Nueva cuenta). */
  reservaId?: string; habitacion?: string;
}
export const TIPOS_FOLIO_EXT = INICIAL.foliosExternos.map(f => `${f.codigo}- ${f.descripcion}`);
export const CUENTAS_CONTABLES = ['1202999 - [001] - CxC por Clasificar', '1203002 - [001] - BNCR', '1401001 - [001] - Cuentas por Cobrar Clientes', '1402002 - [001] - CxC Costa Rica Trails'];
export const TIPOS_DEPOSITO_GAR = ['Sin depósito', 'Efectivo', 'Tarjeta', 'Transferencia'];
export const TIPOS_TARJETA = ['Sin tarjeta', 'Visa', 'Mastercard', 'Amex'];
export const TIPOS_REFERENCIA = ['Factura electrónica', 'Nota de crédito electrónica', 'Nota de débito electrónica', 'Tiquete electrónico', 'Sustituye comprobante rechazado', 'Otros'];
export const TIPOS_EXONERACION = INICIAL.exoneraciones.map(e => e.descripcion);
export const DESCUENTOS_PAGO = INICIAL.descuentos.map(d => ({ id: d.id, nombre: d.descripcion, pct: d.porcentaje }));

/** Número de folio de una reserva: «7» + número de la reserva (RD-4181 → 74181). */
export const folioDeReserva = (r: Reserva) => `7${r.numero.replace(/\D/g, '')}`;
export const saldoFolio = (f: { movs: MovFolio[]; pagos: PagoFolio[] }) =>
  r2(f.movs.filter(m => !m.historico).reduce((s, m) => s + m.importe, 0) - f.pagos.filter(p => !p.historico).reduce((s, p) => s + p.montoFacturado, 0));
const DESAYUNO_PAX = 12;
/** Líneas que la auditoría carga a la reserva (hospedaje por noche, régimen, cargos y descuento). */
export function lineasReserva(r: Reserva): MovFolio[] {
  const n = Math.max(1, noches(r.entrada, r.salida));
  const lineas: MovFolio[] = [];
  const conDesayuno = ['1.BB', 'DESI', 'MP'].includes(r.regimen);
  const des = conDesayuno ? Math.min(r2(r.precio * 0.3), DESAYUNO_PAX * r.adultos) : 0;
  for (let i = 0; i < n; i++) {
    const fecha = sumarDias(r.entrada, i);
    lineas.push({ id: `${r.id}-h${i}`, fecha, hora: '00:00', concepto: 'HOSP', descripcion: `Cargo Aut. Hab-${r.habitacion || '—'}`, origen: 'AUD', conceptoOrig: 'Hospedaje', importe: r2(r.precio - des), tipo: 'Cargo', motivo: 'Cargo Aut.', usuario: 'seven' });
    if (des) lineas.push({ id: `${r.id}-d${i}`, fecha, hora: '00:00', concepto: r.regimen === '1.BB' ? 'BB' : 'DESI', descripcion: 'Desayuno incluido', origen: 'AUD', conceptoOrig: 'Régimen', importe: des, tipo: 'Cargo', motivo: 'Cargo Aut.', usuario: 'seven' });
  }
  r.cargos.forEach((c, i) => {
    const dias = Math.max(1, noches(c.desde, c.hasta) || 1);
    const k = conceptoDe(c.concepto);
    lineas.push({ id: `${r.id}-c${i}`, fecha: c.desde, hora: '00:00', concepto: k.codigo, descripcion: `${c.concepto} × ${c.cantidad}`, origen: 'FDK', conceptoOrig: c.concepto, importe: r2(c.cantidad * c.precio * dias), tipo: 'Cargo', motivo: '', usuario: 'seven' });
  });
  if (r.descuento) lineas.push({ id: `${r.id}-desc`, fecha: r.entrada, hora: '00:00', concepto: 'DESC', descripcion: 'Descuento reserva', origen: 'FDK', conceptoOrig: 'Descuento', importe: -r.descuento, tipo: 'Cargo', motivo: '', usuario: 'seven' });
  return lineas;
}

// ── Facturas (folios cerrados) ───────────────────────────────────────────────
export interface Factura {
  id: string; documento: string; folio: string; clase: ClaseFolio; origen: string; cliente: string; reservaId: string | null; folioId: string | null;
  tarifa: string; empresa: string; moneda: 'USD' | 'CRC'; impCobro: number; impFactura: number; impDepositado: number;
  fecha: string; entrada: string; salida: string; formaPago: string; usuario: string;
  hospedaje: number; regimen: number; otros: number; impuestos: number; servicios: number; porGrupo: Record<string, number>; tipo: 'Factura' | 'Nota de crédito' | 'Nota de débito';
}

// ── Depósitos en garantía ────────────────────────────────────────────────────
export const TIPOS_DEPOSITO = ['Efectivo Dólares', 'Efectivo Colones', 'Tarjeta de crédito', 'Transferencia', 'Cheque'];
export const metodoDeposito = (t: string): Metodo => (t.startsWith('Efectivo') || t === 'Cheque' ? 'Efectivo' : t === 'Tarjeta de crédito' ? 'Tarjeta' : 'Transferencia');
export interface Deposito {
  id: string; numero: number; reservaId: string | null; folioId: string | null; nombre: string; tarifa: string; asignado: string;
  moneda: Mon; tasa: number; importe: number; entregado: number; comisionPct: number; comision: number; vuelto: number;
  tipo: string; referencia: string; tarjeta: { nombre: string; numero: string; mes: string; anio: string };
  vence: string; recibido: string; observaciones: string; estado: 'Activo' | 'Anulado'; anulado?: { fecha: string; usuario: string; motivo: string }; usuario: string;
}

// ── Vouchers de tarjeta ──────────────────────────────────────────────────────
export interface Voucher { id: string; fecha: string; terminal: string; tarjeta: string; marca: string; autorizacion: string; referencia: string; estado: 'Aprobado' | 'Liquidado' | 'Anulado'; moneda: Mon; monto: number; origen: string }

export interface Finanzas {
  sesion: string;
  /** Una sola caja por hotel: la abre y la cierra un Cajero Responsable; los cajeros trabajan en turnos dentro de ella. */
  cajaDia: CajaDia; cierres: CierreCaja[]; turnos: Turno[]; movsCaja: MovCaja[];
  canjes: Canje[]; foliosCta: FolioCuenta[]; foliosRes: Record<string, ExtraFolio>;
  depositos: Deposito[]; facturas: Factura[]; vouchers: Voucher[];
  seq: { canje: number; deposito: number; folio: number; factura: number; cierre: number; voucher: number };
}
