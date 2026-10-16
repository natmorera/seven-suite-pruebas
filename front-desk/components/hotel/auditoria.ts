// ─────────────────────────────────────────────────────────────────────────────
// Auditoría nocturna: historial de auditorías y preauditorías, configuración del
// cierre diario, correos de envío de reportes, problemas de sincronización y
// registro de sincronizaciones con Channel Managers. Semilla determinista.
// ─────────────────────────────────────────────────────────────────────────────
import { HOY, prng, sumarDias, type EstadoHotel, type Reserva } from './datos';
import { claveDe, numeroDe } from './reservas';

export interface ReporteAud { codigo: string; descripcion: string; orden: number; sis: boolean }
/** Catálogo de reportes que puede generar la auditoría. */
export const REPORTES_AUD: ReporteAud[] = ([
  ['PRE', 'Preauditoría Nocturna'], ['LOHAB', 'Listado del Rack de Habitaciones'], ['LOCL', 'Listado del Rack de Clientes'], ['LOCLN', 'Listado del Rack de Clientes por Nacionalidad'],
  ['LOCLNT', 'Listado del Rack de Clientes por Nacionalidad Totalizado'], ['LOCLR', 'Listado del Rack de Clientes por Régimen de Alojamiento'], ['LOCLRT', 'Listado del Rack de Clientes por Régimen de Alojamiento Tot.'],
  ['LOHABR', 'Listado del Rack de Habitaciones por Régimen de Alojamiento'], ['CARAUT', 'Cargos Automáticos'], ['PICK', 'Saldos en el Pick'], ['CkOuts/Pro', 'Tratamiento de Habitaciones sin Prórroga'],
  ['CKINTER', 'Check-In en Proceso'], ['DESAUT', 'Aplicar descuentos automáticos'], ['SALCC', 'Distribución del Saldo de Clientes en Casa'], ['EDCC', 'Edad de las Cuentas de Clientes en Casa'],
  ['MANO', 'Mano Corriente'], ['FAH', 'Facturas Abiertas por Habitación'], ['FAAG', 'Facturas Abiertas por Agencias'], ['FAFE', 'Facturas Abiertas por Folios Externos'], ['FACC', 'Facturas Cerradas'],
  ['CORFC', 'Correcciones a Folios Cerrados'], ['BOLFA', 'Boletas Convertidas a Facturas'], ['CORF', 'Listado de Correcciones a Folios'], ['HSCA', 'Habitaciones sin cargos de alojamiento'],
  ['FEI', 'Facturas de empresa incorrectas'], ['HDPT', 'Habitaciones de directos con precios diferentes a la tarifa'], ['PRODD', 'Informe de Producción Diaria'], ['OFR', 'Otras Facturas Recibidas'],
  ['OAR', 'Otros Asientos Recibidos'], ['LEST', 'Listados Estadísticos'], ['LLAM', 'Llamadas Telefónicas'], ['NOSH', 'Clientes Ausentes (No Shows)'], ['CAMH', 'Cambios de Habitación'],
  ['TRASC', 'Traslado de Cargos'], ['DESFC', 'Descuentos a Facturas Cerradas en el Día'], ['CKANU', 'Check-Ins Anulados'], ['PROR', 'Listado de Prórrogas'], ['CAMAH', 'Cambios a Habitación'],
  ['DEPG', 'Operaciones del Día con Depósitos en Garantía'], ['ASIC', 'Asientos Contables del Día'],
] as const).map(([codigo, descripcion], i) => ({ codigo, descripcion, orden: i + 1, sis: i % 3 !== 2 }));
export const reporteAud = (c: string) => REPORTES_AUD.find(r => r.codigo === c);

export interface CorreoAud { id: string; email: string; reportes: string[] }
export interface Auditoria {
  id: string; tipo: 'Auditoría' | 'Preauditoría'; numero: number; fecha: string; inicio: string; fin: string; usuario: string;
  reportes: string[]; errores?: Record<string, number>; efectos?: string[];
}
export interface ConfigCierre {
  params: Record<string, boolean>; diasLista: number; password: string;
  contable: { impuestosDiarios: boolean; asientoAutomatico: boolean; integracionAutomatica: boolean; asientosDetallados: boolean; libro: string };
  auto: { activa: boolean; dias: boolean[]; desde: string; hasta: string; sinPeriodo: boolean; hora: string } | null;
}
export const PARAMS_CIERRE = ['Cobrar dep. adel. No Show', 'Cobrar dep. adel. Caduco', 'No permitir operaciones diarias', 'Poner todas las habitaciones sucias', 'Incluir estadísticas del pasante',
  'Producc. fact. agencia 1er día', 'Procesar llamadas telefónicas', 'No permitir cierres si hay puntos de venta abiertos', 'Realizar prórrogas automáticas'];
export interface ErrorSync { id: string; fecha: string; descripcion: string; origen: string }
export interface SyncCM { id: string; hora: string; tipo: string; origen: string; idOnline: string; referencia: string; nombreRef: string; llegada: string; salida: string; cantidad: number; nombre: string; sinc: boolean }
export interface DatosAuditoria { auditorias: Auditoria[]; cfgCierre: ConfigCierre; correosAud: CorreoAud[]; erroresSync: ErrorSync[]; syncCM: SyncCM[] }

export const POR_DEFECTO = ['PRE', 'LOHAB', 'LOCL', 'LOCLN', 'LOCLNT', 'PICK', 'CkOuts/Pro', 'CKINTER'];

// ── Semilla ─────────────────────────────────────────────────────────────────
export function crearAuditoria(reservas: Reserva[]): DatosAuditoria {
  const r = prng(5583);
  const usuarios = ['Seven', 'Pablo Solano B', 'auditor'];
  const auditorias: Auditoria[] = [];
  for (let i = 12; i >= 1; i--) {
    const fecha = sumarDias(HOY, -i);
    const mm = 30 + Math.floor(r() * 25);
    if (i <= 6) auditorias.push({ id: `pre${i}`, tipo: 'Preauditoría', numero: 13 - i, fecha, inicio: `${fecha}T22:${String(mm - 20).padStart(2, '0')}`, fin: `${fecha}T22:${String(mm - 19).padStart(2, '0')}`, usuario: 'Pablo Solano B', reportes: ['PRE'] });
    auditorias.push({ id: `aud${i}`, tipo: 'Auditoría', numero: 5583 - i, fecha, inicio: `${fecha}T23:${String(mm).padStart(2, '0')}`, fin: `${fecha}T23:${String(mm + 1 + Math.floor(r() * 3)).padStart(2, '0')}`, usuario: usuarios[i % 3],
      reportes: i % 4 === 0 ? REPORTES_AUD.slice(0, 14).map(x => x.codigo) : POR_DEFECTO });
  }
  const errores = ['Referencia a objeto no establecida como instancia de un objeto.', 'No se pudo encontrar una reserva con el número especificado.', 'Tiempo de espera agotado al conectar con el Channel Manager.',
    'La tarifa enviada por el canal no existe en el hotel.', 'El tipo de habitación del canal no tiene equivalencia configurada.', 'No se pudo actualizar la disponibilidad: el canal rechazó la solicitud (409).'];
  const erroresSync: ErrorSync[] = Array.from({ length: 26 }, (_, i) => {
    const fecha = sumarDias(HOY, -Math.floor(i / 3));
    return { id: `es${i}`, fecha: `${fecha}T${String(6 + ((i * 5) % 16)).padStart(2, '0')}:${String((i * 17) % 60).padStart(2, '0')}`, descripcion: errores[Math.floor(r() * errores.length)], origen: ['Booking.com', 'Expedia Group', 'Channel Manager', 'Contabilidad'][i % 4] };
  });
  const ota = reservas.filter(x => ['BOOKING', 'EXPEDIA', 'DESPEGAR', 'HOTELBEDS'].includes(x.tarifa) && x.entrada >= sumarDias(HOY, -3)).slice(0, 24);
  const syncCM: SyncCM[] = ota.map((x, i) => ({
    id: `cm${i}`, hora: `${sumarDias(HOY, -(i % 4))}T${String(8 + (i % 12)).padStart(2, '0')}:${String((i * 13) % 60).padStart(2, '0')}`, tipo: x.tipo,
    origen: x.estado === 'In-House' || x.estado === 'Completada' ? 'Check-In' : x.estado === 'Anulada' ? 'Anulación' : 'Reservas', idOnline: x.idExterno ?? '', referencia: x.numero,
    nombreRef: x.tarifa.toLowerCase(), llegada: x.entrada, salida: x.salida, cantidad: x.estado === 'Anulada' ? 1 : -1, nombre: x.detalles?.usuario ?? 'seven', sinc: i % 6 !== 4,
  }));
  return {
    auditorias, erroresSync, syncCM,
    correosAud: [{ id: 'ca1', email: 'gerencia@hotelfortuna.com', reportes: POR_DEFECTO }, { id: 'ca2', email: 'contabilidad@hotelfortuna.com', reportes: ['PICK', 'FACC'] }],
    cfgCierre: {
      params: Object.fromEntries(PARAMS_CIERRE.map((p, i) => [p, i === 3 || i === 7])), diasLista: 366, password: '1234',
      contable: { impuestosDiarios: true, asientoAutomatico: true, integracionAutomatica: false, asientosDetallados: true, libro: 'G' },
      auto: { activa: true, dias: [false, true, true, true, true, true, false], desde: sumarDias(HOY, -30), hasta: sumarDias(HOY, 60), sinPeriodo: false, hora: '20:00' },
    },
  };
}

// ── Acciones ────────────────────────────────────────────────────────────────
type Mut = (f: (d: EstadoHotel) => EstadoHotel) => void;
let k = 0;
const uid = (p: string) => `${p}${Date.now().toString(36)}${(k++).toString(36)}`;
const ahora = () => { const d = new Date(); return `${HOY}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
export const ultimaAuditoria = (x: Pick<DatosAuditoria, 'auditorias'>) => [...x.auditorias].filter(a => a.tipo === 'Auditoría').sort((a, b) => b.inicio.localeCompare(a.inicio))[0];

export function accionesAuditoria(mut: Mut) {
  return {
    registrarPreauditoria: (errores: Record<string, number>) => mut(x => ({ ...x, auditorias: [...x.auditorias, { id: uid('pre'), tipo: 'Preauditoría', numero: x.auditorias.filter(a => a.tipo === 'Preauditoría').length + 1, fecha: HOY, inicio: ahora(), fin: ahora(), usuario: x.sesion, reportes: ['PRE'], errores }] })),
    guardarCorreosAud: (c: CorreoAud[]) => mut(x => ({ ...x, correosAud: c })),
    guardarCfgCierre: (c: ConfigCierre) => mut(x => ({ ...x, cfgCierre: c })),
    /** Cierre del día: No-Show de llegadas no presentadas, prórrogas automáticas, habitaciones sucias y registro del cierre. */
    ejecutarAuditoria: (reportes: string[], inicio: string) => mut(x => {
      const p = x.cfgCierre.params;
      const efectos: string[] = [];
      const bit = { ...x.bitacoraRes };
      const log = (r: Reserva, accion: string, antes: string, despues: string) => { const c = claveDe(r); bit[c] = [...(bit[c] ?? []), { id: uid('b'), fecha: ahora(), usuario: 'Auditoría nocturna', accion, antes, despues }]; };
      const reservas = x.reservas.map(r => {
        if (r.estado === 'Confirmada' && r.entrada <= HOY && !r.checkinEn) { efectos.push(`No-Show: reserva ${numeroDe(r)} (${r.nombre})${p['Cobrar dep. adel. No Show'] && r.depGarantia ? ' · depósito aplicado' : ''}`); log(r, 'Reserva marcada como No-Show', 'Estado: Confirmada', 'Estado: No-Show'); return { ...r, estado: 'No-Show' as const }; }
        if (r.estado === 'In-House' && r.salida <= HOY && p['Realizar prórrogas automáticas']) { efectos.push(`Prórroga automática: habitación ${r.habitacion} hasta ${sumarDias(HOY, 1).split('-').reverse().join('/')}`); log(r, 'Prórroga automática', `Salida: ${r.salida}`, `Salida: ${sumarDias(HOY, 1)}`); return { ...r, salida: sumarDias(HOY, 1) }; }
        return r;
      });
      const noShowHabs = new Set(x.reservas.filter(r => r.estado === 'Confirmada' && r.entrada <= HOY && !r.checkinEn).map(r => r.habitacion));
      let habitaciones = x.habitaciones.map(h => (noShowHabs.has(h.numero) && (h.estado === 'checkin' || h.estado === 'checkinRL') ? { ...h, estado: 'libre' as const } : h));
      if (p['Realizar prórrogas automáticas']) habitaciones = habitaciones.map(h => (h.estado === 'checkout' ? { ...h, estado: 'ocupada' as const } : h));
      if (p['Poner todas las habitaciones sucias']) { habitaciones = habitaciones.map(h => (h.estado === 'ocupada' ? { ...h, sucia: true } : h)); efectos.push('Habitaciones ocupadas marcadas como sucias'); }
      if (!efectos.length) efectos.push('Sin cambios en reservas: no había llegadas pendientes ni salidas sin procesar.');
      const ult = ultimaAuditoria(x);
      return { ...x, reservas, habitaciones, bitacoraRes: bit, auditorias: [...x.auditorias, { id: uid('aud'), tipo: 'Auditoría', numero: (ult?.numero ?? 5582) + 1, fecha: HOY, inicio, fin: ahora(), usuario: x.sesion, reportes, efectos }] };
    }),
  };
}
