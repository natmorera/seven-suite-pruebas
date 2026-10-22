// ─────────────────────────────────────────────────────────────────────────────
// Reservaciones: estados de la reserva, reservas de varias habitaciones
// (líneas con el mismo `grupo`), bitácora, mensajes y preasignaciones.
// La semilla ajusta la de datos.ts (solicitadas, lista de espera, no-show,
// grupos y reservas sin habitación) de forma determinista.
// ─────────────────────────────────────────────────────────────────────────────
import type { BadgeColor } from '@/components/suite/ui';
import {
  HOY, TIPOS, USUARIOS, USUARIO_ACTUAL, noches, sumarDias,
  type DetallesReserva, type EstadoHotel, type EstadoReserva, type Habitacion, type Perfil, type Reserva,
} from './datos';

// ── Tipos ───────────────────────────────────────────────────────────────────
export interface EventoRes { id: string; fecha: string; usuario: string; accion: string; antes: string; despues: string }
export interface MensajeRes { id: string; fecha: string; remitente: string; destinatario: string; cuerpo: string }
/** Tramo de una estancia dividida: el huésped ocupa `habitacion` desde `desde` hasta `hasta` (salida). */
export interface Tramo { desde: string; hasta: string; tipo: string; habitacion: string; precio: number }
export interface Preasignacion { id: string; habitacion: string; desde: string; hasta: string; descripcion: string }
export interface DatosReservas {
  /** Bitácora manual por reserva (clave = grupo o id). La bitácora base se deriva de los datos. */
  bitacoraRes: Record<string, EventoRes[]>;
  mensajesRes: Record<string, MensajeRes[]>;
  preasignaciones: Preasignacion[];
  seqReserva: number;
}

// ── Reglas ──────────────────────────────────────────────────────────────────
/** Etiqueta y color del chip (Solicitada naranja, Confirmada verde, Lista de espera amarillo, In-House azul…). */
export const ESTADO_UI: Record<EstadoReserva, { color: BadgeColor; hex: string }> = {
  Solicitada: { color: 'orange', hex: '#EF6C00' },
  Confirmada: { color: 'green', hex: '#2E7D32' },
  'Lista de espera': { color: 'yellow', hex: '#B58900' },
  'In-House': { color: 'brand', hex: '#213C89' },
  Completada: { color: 'gray', hex: '#424242' },
  'No-Show': { color: 'gray', hex: '#9E9E9E' },
  Anulada: { color: 'red', hex: '#C62828' },
};
/** Transiciones de estado permitidas de una reserva. */
export const TRANSICIONES: Record<EstadoReserva, { a: EstadoReserva; label: string; peligro?: boolean }[]> = {
  Solicitada: [{ a: 'Confirmada', label: 'Confirmar reserva' }, { a: 'Lista de espera', label: 'Pasar a lista de espera' }, { a: 'Anulada', label: 'Anular reserva', peligro: true }],
  Confirmada: [{ a: 'Lista de espera', label: 'Pasar a lista de espera' }, { a: 'In-House', label: 'In-House (Check-in)' }, { a: 'No-Show', label: 'No-Show' }, { a: 'Anulada', label: 'Anular reserva', peligro: true }],
  'Lista de espera': [{ a: 'Confirmada', label: 'Confirmar reserva' }, { a: 'Anulada', label: 'Anular reserva', peligro: true }],
  'In-House': [{ a: 'Completada', label: 'Completada (Check-out)' }],
  Completada: [], 'No-Show': [], Anulada: [],
};
/** Reserva que ocupa la habitación en el inventario (no se puede asignar a otra). */
/** Reserva cerrada: ya no admite cambios (completada, no-show o anulada). */
export const reservaCerrada = (r: { estado: EstadoReserva }) => ['Completada', 'No-Show', 'Anulada'].includes(r.estado);
export const bloqueaHabitacion = (r: Reserva) => r.estado === 'Solicitada' || r.estado === 'Confirmada' || r.estado === 'In-House';
/** Reserva que cuenta para ocupación y estadísticas (confirmadas, en casa y completadas). */
export const cuentaOcupacion = (r: Reserva) => r.estado === 'Confirmada' || r.estado === 'In-House' || r.estado === 'Completada';
/** Clave de la reserva (varias líneas = un grupo). */
export const claveDe = (r: Reserva) => r.grupo ?? r.id;
/** Número visible de la reserva (sin prefijo ni sufijo de línea): RE-4400_2 → 4400. */
export const numeroDe = (r: Reserva) => r.numero.replace(/_\d+$/, '').replace(/^\D+-?/, '');
export const esAgencia = (r: Reserva) => r.cliente === 'Agencia de Viajes';
/** Uso de la habitación según ocupación (SGL, DBL, TPL, CPL). */
export const usoDe = (r: Pick<Reserva, 'adultos' | 'ninos'>) => ['SGL', 'SGL', 'DBL', 'TPL', 'CPL'][Math.min(4, r.adultos + r.ninos)] ?? 'CPL';
export const USOS = [{ id: 'SGL', label: 'Sencilla' }, { id: 'DBL', label: 'Doble' }, { id: 'TPL', label: 'Triple' }, { id: 'CPL', label: 'Cuádruple' }];
export const ORIGENES = ['Teléfono', 'Correo electrónico', 'Walk-in', 'Sitio web', 'Channel manager', 'Agencia', 'Recomendación'];
export const MERCADOS = ['Nacional', 'Internacional', 'Corporativo', 'Grupos', 'Gobierno'];
export const AGENTES = ['Sofía Jiménez', 'Andrés Quesada', 'Mariana Solís'];
export const detallesVacios = (): DetallesReserva => ({ usuario: USUARIO_ACTUAL, agente: '', referencia: '', referidor: '', origen: '', placa: '', consecutivo: '', vuelo: '', noEnviarEmail: false });
export const mercadoDe = (r: Reserva) => (r.cliente === 'Tarifa Corporativa' ? 'Corporativo' : r.nacionalidad === 'CRI' ? 'Nacional' : 'Internacional');
/** Precio por noche (i.i.) de un tipo según la tarifa. */
export const precioTarifa = (tipo: string, tarifa: string) => {
  const t = TIPOS.find(x => x.id === tipo)?.tarifa ?? 0;
  return Math.round(t * (tarifa === 'DIR' ? 1 : tarifa === 'CORP' ? 0.85 : 0.92));
};
/** ¿La habitación está libre entre dos fechas? (ignora las reservas indicadas) */
export function habitacionLibre(reservas: Reserva[], num: string, entrada: string, salida: string, ignorar: string[] = []) {
  return !reservas.some(r => r.habitacion === num && !ignorar.includes(r.id) && bloqueaHabitacion(r) && r.entrada < salida && r.salida > entrada);
}
/** Agrupa las líneas por reserva, con la primera línea como «principal». */
export function agrupar(reservas: Reserva[]) {
  const m = new Map<string, Reserva[]>();
  reservas.forEach(r => { const k = claveDe(r); const l = m.get(k); if (l) l.push(r); else m.set(k, [r]); });
  return [...m.entries()].map(([clave, lineas]) => {
    const ls = [...lineas].sort((a, b) => a.numero.localeCompare(b.numero, 'es', { numeric: true }));
    return { clave, lineas: ls, principal: ls[0] };
  });
}
export type GrupoReserva = ReturnType<typeof agrupar>[number];
/** Modalidad de una reserva de varias habitaciones (null si es de una sola habitación). */
export const modalidadDe = (g: { lineas: Reserva[]; principal: Reserva }) => (g.lineas.length > 1 ? g.principal.modalidad ?? 'individual' : null);
/** ¿Toda la reserva se cobra en una sola factura? Grupo siempre; individual múltiple si así se eligió en el check-in. */
export const facturaAgrupada = (g: { lineas: Reserva[]; principal: Reserva }) => {
  const m = modalidadDe(g);
  return m === 'grupo' || (m === 'individual' && g.principal.facturaUnica === true);
};
/** Conceptos de hospedaje (van al folio de agencia en los grupos). */
export const CONCEPTOS_HOSPEDAJE = ['HOSP', 'BB', 'DESI', 'DESC'];
/** Estado de la reserva completa (el «más avanzado» de sus líneas activas). */
export function estadoGrupo(ls: Reserva[]): EstadoReserva {
  const vivos = ls.filter(l => l.estado !== 'Anulada' && l.estado !== 'No-Show');
  if (!vivos.length) return ls.some(l => l.estado === 'No-Show') ? 'No-Show' : 'Anulada';
  for (const e of ['In-House', 'Confirmada', 'Lista de espera', 'Solicitada'] as EstadoReserva[]) if (vivos.some(l => l.estado === e)) return e;
  return 'Completada';
}

// ── Bitácora base (derivada de los datos) ───────────────────────────────────
export function bitacoraBase(ls: Reserva[]): EventoRes[] {
  const p = ls[0];
  const out: EventoRes[] = [];
  const e = (fecha: string, accion: string, antes: string, despues: string, usuario = p.detalles?.usuario || USUARIO_ACTUAL) =>
    out.push({ id: `${p.id}-${out.length}`, fecha, usuario, accion, antes, despues });
  const creada = p.creada ?? `${sumarDias(p.entrada, -7)}T09:00`;
  const mas = (min: number) => { const [hh, mm] = creada.slice(11, 16).split(':').map(Number); const t = Math.min(23 * 60 + 59, hh * 60 + mm + min); return `${creada.slice(0, 11)}${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`; };
  e(creada, 'Creación de reserva', '-', `Reserva: #${numeroDe(p)} | Estado: Solicitada`);
  if (p.estado !== 'Solicitada') e(mas(10), 'Cambio de estado', 'Estado: Solicitada', `Estado: ${p.estado === 'Lista de espera' ? 'Lista de espera' : 'Confirmada'}`);
  ls.forEach(l => {
    if (l.habitacion) e(mas(15), 'Habitación asignada', 'Sin habitación', `Habitación ${TIPOS.find(t => t.id === l.tipo)?.nombre ?? l.tipo} ${l.habitacion}`);
    if (l.checkinEn) e(`${l.checkinEn}T14:${String(3 + (Number(l.id.replace(/\D/g, '')) % 50)).padStart(2, '0')}`, 'Check-in realizado', 'Estado: Confirmada', `Estado: In-House${ls.length > 1 ? ` · Hab ${l.habitacion}` : ''}`);
    if (l.checkoutEn) e(`${l.checkoutEn}T11:10`, 'Check-out realizado', 'Estado: In-House', `Estado: Completada${ls.length > 1 ? ` · Hab ${l.habitacion}` : ''}`);
    if (l.estado === 'No-Show') e(`${sumarDias(l.entrada, 1)}T02:00`, 'Reserva marcada como No-Show', 'Estado: Confirmada', 'Estado: No-Show', 'Auditoría nocturna');
    if (l.anulacion) e(l.anulacion.fecha, 'Reserva anulada', `Estado: Confirmada`, `Estado: Anulada · ${l.anulacion.motivo}`, l.anulacion.usuario);
  });
  return out;
}

// ── Semilla ─────────────────────────────────────────────────────────────────
export function ajustarSemilla(s: { reservas: Reserva[]; habitaciones: Habitacion[]; perfiles: Perfil[] }): { reservas: Reserva[]; habitaciones: Habitacion[]; datos: DatosReservas } {
  const habitaciones = s.habitaciones.map(h => ({ ...h }));
  const reservas: Reserva[] = s.reservas.map(x => {
    const n = Number(x.numero.replace(/\D/g, ''));
    const antic = 3 + (n % 28);
    const creada = `${sumarDias(x.entrada, -antic)}T${String(8 + (n % 10)).padStart(2, '0')}:${String((n * 7) % 60).padStart(2, '0')}`;
    const ota = ['BOOKING', 'EXPEDIA', 'DESPEGAR', 'HOTELBEDS'].includes(x.tarifa);
    return {
      ...x, creada, idExterno: ota ? String(3000000000 + n * 7919).slice(0, 10) : '',
      detalles: { ...detallesVacios(), usuario: USUARIOS[n % 4], agente: x.cliente === 'Huésped Individual' ? '' : AGENTES[n % 3], origen: ota ? 'Channel manager' : ORIGENES[n % 4], referencia: ota ? `${x.tarifa.slice(0, 3)}-${n}` : '' },
    };
  });
  // Las reservas futuras aleatorias de la semilla pueden chocar con otras: se reubican
  // en una habitación libre del mismo tipo (o quedan sin asignar).
  const ocupa = (x: Reserva) => x.estado !== 'Anulada' && x.estado !== 'No-Show' && x.estado !== 'Lista de espera' && !!x.habitacion;
  const choca = (x: Reserva, num: string) => reservas.some(y => y !== x && ocupa(y) && y.habitacion === num && y.entrada < x.salida && y.salida > x.entrada);
  [...reservas].filter(x => x.entrada > HOY && ocupa(x)).sort((a, b) => a.entrada.localeCompare(b.entrada) || a.numero.localeCompare(b.numero)).forEach(x => {
    if (!choca(x, x.habitacion)) return;
    x.habitacion = habitaciones.find(h => h.tipo === x.tipo && !choca(x, h.numero))?.numero ?? '';
  });
  // Futuras: algunas aún solicitadas, otras en lista de espera y otras sin habitación asignada
  const futuras = reservas.filter(x => x.estado === 'Confirmada' && x.entrada > sumarDias(HOY, 1));
  futuras.forEach((x, i) => {
    if (i % 5 === 0) x.estado = 'Solicitada';
    else if (i % 11 === 3) x.estado = 'Lista de espera';
    if (i % 7 === 2 && x.estado !== 'Lista de espera') x.habitacion = '';
  });
  // Upgrades: reservadas como Estándar pero asignadas a una Superior (aparecen en «Reservas con habitaciones incorrectas»)
  futuras.filter(x => x.habitacion && x.tipo === 'SUP' && x.estado === 'Confirmada').slice(0, 2).forEach(x => { x.tipo = 'STD'; });
  // No-show de los últimos días
  const pasadas = reservas.filter(x => x.estado === 'Completada' && x.entrada >= sumarDias(HOY, -6) && x.entrada < sumarDias(HOY, -1));
  pasadas.slice(0, 2).forEach((x, i) => {
    reservas.push({ ...x, id: `rns${i}`, numero: `RE-${4390 + i}`, estado: 'No-Show', checkinEn: null, checkoutEn: null, pagado: 0, perfilId: null, nombre: ['MARK STEVENSON', 'LUCÍA FERNÁNDEZ'][i],
      nacionalidad: ['USA', 'ESP'][i], identificacion: '', email: '', telefono: '', vip: false, cuentas: [{ id: `rns${i}c1`, nombre: 'Cuenta 1', saldo: 0, consumos: 0 }], depGarantia: 0, cargos: [], adicionales: [] });
  });

  // Reservas de varias habitaciones (grupos)
  const crearGrupo = (base: number, entrada: string, salida: string, cant: number, plantilla: Partial<Reserva>, tipos: string[], estado: EstadoReserva) => {
    const libres = habitaciones.filter(h => tipos.includes(h.tipo) && h.estado !== 'bloqueada' && habitacionLibre(reservas, h.numero, entrada, salida));
    const nombres = ['ANA LAURA RAMÍREZ CALVO', 'GONZALO MORALES', 'PATRICIA ULLOA', 'ESTEBAN QUIRÓS', 'DIANA VARGAS'];
    for (let i = 0; i < cant; i++) {
      const hab = libres[i];
      const tipo = hab?.tipo ?? tipos[0];
      const id = `rg${base}_${i + 1}`;
      const precio = precioTarifa(tipo, plantilla.tarifa ?? 'DIR');
      reservas.push({
        id, numero: `RE-${base}_${i + 1}`, rooming: false, perfilId: null, nombre: nombres[i], empresa: '', cliente: 'Huésped Individual', habitacion: hab?.numero ?? '', tipo, entrada, salida,
        adultos: 2, ninos: i === 0 ? 1 : 0, tarifa: 'DIR', precio, regimen: '1.BB', moneda: 'USD', estado, pagado: 0, depGarantia: 0, credito: false, condiciones: [], observaciones: '', observacionesInternas: '',
        nacionalidad: 'CRI', identificacion: '', email: '', telefono: '', vip: false, tarjetaLista: false, checkinEn: null, checkoutEn: null,
        cuentas: [{ id: id + 'c1', nombre: 'Cuenta 1', saldo: Math.round(precio * noches(entrada, salida) * 100) / 100, consumos: 0 }], cargos: [], adicionales: [], descuento: 0,
        grupo: `g${base}`, creada: `${sumarDias(HOY, -9)}T10:${String(10 + i).padStart(2, '0')}`, idExterno: '', detalles: { ...detallesVacios(), usuario: USUARIO_ACTUAL, origen: 'Correo electrónico' },
        ...plantilla,
      });
      if (hab && entrada === HOY && hab.estado === 'libre') hab.estado = 'checkin';
    }
  };
  const shl = s.perfiles.find(p => p.tipo === 'empresa');
  crearGrupo(4400, sumarDias(HOY, 8), sumarDias(HOY, 11), 3, { tarifa: 'CORP', cliente: 'Tarifa Corporativa', empresa: shl?.nombre ?? '', credito: true, modalidad: 'grupo', observaciones: 'Equipo de auditoría externa. Facturar alojamiento a la empresa.' }, ['SUP', 'DLX'], 'Confirmada');
  crearGrupo(4401, HOY, sumarDias(HOY, 2), 2, { tarifa: 'BOOKING', cliente: 'Agencia de Viajes', empresa: 'Booking.com', idExterno: '4028411752', tarjetaLista: true, modalidad: 'individual' }, ['STD', 'SUP', 'FAM'], 'Confirmada');
  crearGrupo(4402, sumarDias(HOY, 15), sumarDias(HOY, 18), 2, { tarifa: 'DIR', regimen: 'MP', modalidad: 'individual' }, ['FAM', 'JRS'], 'Solicitada');
  // Llegadas de hoy aún sin habitación (se asignan desde el Mapa, arrastrándolas)
  [['rsh1', 'RE-4405', 'VALENTINA ROJAS MÉNDEZ', 'STD', 2, 'MEX'], ['rsh2', 'RE-4406', 'THOMAS WEBER', 'DLX', 1, 'DEU']].forEach(([id, numero, nombre, tipo, ad, nac]) => {
    const precio = precioTarifa(tipo as string, 'DIR');
    reservas.push({ id: id as string, numero: numero as string, rooming: false, perfilId: null, nombre: nombre as string, empresa: '', cliente: 'Huésped Individual', habitacion: '', tipo: tipo as string, entrada: HOY, salida: sumarDias(HOY, 3),
      adultos: ad as number, ninos: 0, tarifa: 'DIR', precio, regimen: '1.BB', moneda: 'USD', estado: 'Confirmada', pagado: 0, depGarantia: 0, credito: false, condiciones: [], observaciones: '', observacionesInternas: '',
      nacionalidad: nac as string, identificacion: '', email: '', telefono: '', vip: false, tarjetaLista: false, checkinEn: null, checkoutEn: null,
      cuentas: [{ id: `${id}c1`, nombre: 'Cuenta 1', saldo: precio * 3, consumos: 0 }], cargos: [], adicionales: [], descuento: 0, creada: `${sumarDias(HOY, -4)}T09:30`, idExterno: '', detalles: { ...detallesVacios(), usuario: USUARIO_ACTUAL, origen: 'Teléfono' } });
  });
  // Precio de los grupos según su tarifa real
  reservas.filter(x => x.grupo).forEach(x => { x.precio = precioTarifa(x.tipo, x.tarifa); x.cuentas = [{ ...x.cuentas[0], saldo: x.precio * noches(x.entrada, x.salida) }]; });

  const mensajesRes: Record<string, MensajeRes[]> = {};
  const conMensajes = reservas.filter(x => x.estado === 'Confirmada' && x.entrada >= HOY).slice(0, 6);
  conMensajes.forEach((x, i) => {
    mensajesRes[claveDe(x)] = [
      { id: `m${i}a`, fecha: `${sumarDias(HOY, -3)}T08:45`, remitente: 'Sofía', destinatario: 'Juan', cuerpo: `El huésped ${x.nombre.split(' ')[0]} solicita late check-out si hay disponibilidad.` },
      { id: `m${i}b`, fecha: `${sumarDias(HOY, -2)}T10:12`, remitente: 'Juan', destinatario: 'Sofía', cuerpo: 'Anotado. Se confirma el día de la salida según ocupación.' },
    ];
  });
  const preasignaciones: Preasignacion[] = [0, 1].map(i => {
    const desde = sumarDias(HOY, 3 + i * 4), hasta = sumarDias(HOY, 5 + i * 4);
    const hab = habitaciones.filter(h => h.estado === 'libre' && habitacionLibre(reservas, h.numero, desde, sumarDias(hasta, 1)))[i];
    return { id: `pa${i}`, habitacion: hab?.numero ?? '', desde, hasta, descripcion: i ? 'Bloqueo para grupo de boda (pendiente de rooming)' : 'Huésped frecuente solicita esta habitación' };
  }).filter(p => p.habitacion);
  return { reservas, habitaciones, datos: { bitacoraRes: {}, mensajesRes, preasignaciones, seqReserva: 4410 } };
}

// ── Acciones ────────────────────────────────────────────────────────────────
type Mut = (f: (d: EstadoHotel) => EstadoHotel) => void;
let k = 0;
const uid = (p: string) => `${p}${Date.now().toString(36)}${(k++).toString(36)}`;
const ahora = () => { const d = new Date(); return `${HOY}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };

/** Estado del mapa de una habitación libre según sus llegadas de hoy. */
export function estadoLibre(num: string, reservas: Reserva[]): Habitacion['estado'] {
  const llegadas = reservas.filter(r => r.habitacion === num && r.estado === 'Confirmada' && r.entrada === HOY);
  if (!llegadas.length) return 'libre';
  return llegadas.some(r => r.rooming) ? 'checkinRL' : 'checkin';
}
/** Recalcula el estado de las habitaciones libres / con llegada (tras confirmar, anular, asignar…). */
export function refrescarHabs(habs: Habitacion[], reservas: Reserva[], nums: string[]) {
  return habs.map(h => (nums.includes(h.numero) && ['libre', 'checkin', 'checkinRL'].includes(h.estado) ? { ...h, estado: estadoLibre(h.numero, reservas) } : h));
}

export function accionesReservas(mut: Mut) {
  const log = (x: EstadoHotel, clave: string, accion: string, antes = '-', despues = '-'): EstadoHotel =>
    ({ ...x, bitacoraRes: { ...x.bitacoraRes, [clave]: [...(x.bitacoraRes[clave] ?? []), { id: uid('b'), fecha: ahora(), usuario: x.sesion, accion, antes, despues }] } });
  return {
    /** Registra un evento manual en la bitácora de la reserva. */
    registrarBitacora: (clave: string, accion: string, antes = '-', despues = '-') => mut(x => log(x, clave, accion, antes, despues)),
    /** Cambia el estado de una o varias líneas (Confirmar, Lista de espera, No-Show). */
    cambiarEstado: (ids: string[], estado: EstadoReserva) => mut(x => {
      const afect = x.reservas.filter(r => ids.includes(r.id));
      const reservas = x.reservas.map(r => (ids.includes(r.id) ? { ...r, estado } : r));
      const y = { ...x, reservas, habitaciones: refrescarHabs(x.habitaciones, reservas, afect.map(r => r.habitacion)) };
      const antes = [...new Set(afect.map(r => r.estado))].join(', ');
      return log(y, claveDe(afect[0]), estado === 'No-Show' ? 'Reserva marcada como No-Show' : 'Cambio de estado', `Estado: ${antes}`, `Estado: ${estado}`);
    }),
    anularReserva: (ids: string[], motivo: string) => mut(x => {
      const afect = x.reservas.filter(r => ids.includes(r.id));
      const fecha = ahora();
      const reservas = x.reservas.map(r => (ids.includes(r.id) ? { ...r, estado: 'Anulada' as const, anulacion: { fecha, usuario: x.sesion, motivo } } : r));
      const habitaciones = refrescarHabs(x.habitaciones, reservas, afect.map(r => r.habitacion));
      return log({ ...x, reservas, habitaciones }, claveDe(afect[0]), 'Reserva anulada', `Estado: ${afect[0].estado}`, `Estado: Anulada · ${motivo}`);
    }),
    /** Prórroga: nueva fecha de salida (y diferencia económica en el folio). */
    prorroga: (id: string, salida: string) => mut(x => {
      const r = x.reservas.find(y => y.id === id)!;
      const reservas = x.reservas.map(y => (y.id === id ? { ...y, salida, cuentas: y.cuentas.map((c, i) => (i === 0 ? { ...c, saldo: Math.round((c.saldo + y.precio * (noches(y.entrada, salida) - noches(y.entrada, y.salida))) * 100) / 100 } : c)) } : y));
      const habitaciones = r.estado === 'In-House' ? x.habitaciones.map(h => (h.numero === r.habitacion && h.estado === 'checkout' && salida > HOY ? { ...h, estado: 'ocupada' as const } : h)) : x.habitaciones;
      return log({ ...x, reservas, habitaciones }, claveDe(r), 'Prórroga de habitación', `Salida: ${r.salida.split('-').reverse().join('/')}`, `Salida: ${salida.split('-').reverse().join('/')} · Hab ${r.habitacion || '—'}`);
    }),
    /** Asigna (o cambia) la habitación de una línea sin check-in. */
    asignarHabitacion: (id: string, num: string) => mut(x => {
      const r = x.reservas.find(y => y.id === id)!;
      const tipo = x.habitaciones.find(h => h.numero === num)?.tipo ?? r.tipo;
      const reservas = x.reservas.map(y => (y.id === id ? { ...y, habitacion: num, tipo } : y));
      const habitaciones = refrescarHabs(x.habitaciones, reservas, [r.habitacion, num]);
      return log({ ...x, reservas, habitaciones }, claveDe(r), r.habitacion ? 'Habitación cambiada' : 'Habitación asignada', r.habitacion ? `Habitación ${r.habitacion}` : 'Sin habitación', `Habitación ${num}`);
    }),
    /** Crea una reserva de una o varias líneas. */
    crearReservaGrupo: (lineas: Reserva[], evento = 'Creación de reserva') => mut(x => {
      const reservas = [...x.reservas, ...lineas];
      const habitaciones = refrescarHabs(x.habitaciones, reservas, lineas.map(l => l.habitacion));
      const p = lineas[0];
      return log({ ...x, reservas, habitaciones, seqReserva: x.seqReserva + 1 }, claveDe(p), evento, '-', `Reserva: #${numeroDe(p)} | Estado: ${p.estado}`);
    }),
    /** Divide la estancia en tramos por habitación (desde el check-in). La reserva queda con el primer tramo
     *  y cada tramo siguiente es una línea nueva del mismo grupo: confirmada, con la habitación asignada,
     *  la tarjeta de registro ya lista y todo en una sola factura con la original. */
    dividirEstancia: (id: string, tramos: Tramo[]) => mut(x => {
      const r = x.reservas.find(y => y.id === id);
      if (!r || tramos.length < 2) return x;
      const clave = claveDe(r);
      const base = r.numero.replace(/_\d+$/, '');
      let n = Math.max(1, ...x.reservas.filter(y => claveDe(y) === clave).map(y => Number(/_(\d+)$/.exec(y.numero)?.[1] ?? 1)));
      const [t0, ...resto] = tramos;
      let previa = r.id;
      const nuevas: Reserva[] = resto.map(t => {
        const nid = uid('r'); n += 1;
        const linea: Reserva = {
          ...r, id: nid, numero: `${base}_${n}`, grupo: clave, continuaDe: previa, entrada: t.desde, salida: t.hasta, tipo: t.tipo, habitacion: t.habitacion, precio: t.precio,
          estado: 'Confirmada', pagado: 0, depGarantia: 0, checkinEn: null, checkoutEn: null, tarjetaLista: true, anulacion: undefined, modalidad: 'individual', facturaUnica: true,
          cuentas: [{ id: `${nid}c1`, nombre: 'Cuenta 1', saldo: t.precio * noches(t.desde, t.hasta), consumos: 0 }],
          // Los cargos automáticos siguen al huésped: cada tramo se queda con los días que le tocan
          cargos: r.cargos.filter(c => c.desde < t.hasta && c.hasta > t.desde).map(c => ({ ...c, id: uid('cg'), desde: c.desde > t.desde ? c.desde : t.desde, hasta: c.hasta < t.hasta ? c.hasta : t.hasta })),
          adicionales: r.adicionales.map(a => ({ ...a, id: uid('ad') })),
        };
        previa = nid;
        return linea;
      });
      const movido = r.precio * noches(t0.hasta, r.salida);
      const reservas = [
        ...x.reservas.map(y => (y.id !== id ? y : {
          ...y, grupo: clave, salida: t0.hasta, tipo: t0.tipo, habitacion: t0.habitacion, precio: t0.precio, modalidad: y.modalidad ?? 'individual' as const, facturaUnica: true,
          cargos: y.cargos.filter(c => c.desde < t0.hasta).map(c => ({ ...c, hasta: c.hasta < t0.hasta ? c.hasta : t0.hasta })),
          cuentas: y.cuentas.map((c, i) => (i === 0 ? { ...c, saldo: Math.max(0, c.saldo - movido) } : c)),
        })),
        ...nuevas,
      ];
      const habitaciones = refrescarHabs(x.habitaciones, reservas, [r.habitacion, ...tramos.map(t => t.habitacion)]);
      return log({ ...x, reservas, habitaciones }, clave, 'Estancia dividida en el check-in', `Hab. ${r.habitacion || '—'} · ${r.entrada} → ${r.salida}`,
        tramos.map(t => `Hab. ${t.habitacion} del ${t.desde} al ${t.hasta}`).join(' | '));
    }),
    /** Agrega líneas a una reserva existente (solo Solicitada). */
    agregarLineas: (clave: string, lineas: Reserva[]) => mut(x => {
      const reservas = [...x.reservas.map(r => (r.id === clave && !r.grupo ? { ...r, grupo: clave } : r)), ...lineas];
      return log({ ...x, reservas, habitaciones: refrescarHabs(x.habitaciones, reservas, lineas.map(l => l.habitacion)) }, clave, 'Habitación agregada', '-', lineas.map(l => `${l.tipo}${l.habitacion ? ' ' + l.habitacion : ''}`).join(', '));
    }),
    /** Actualiza varias líneas de una reserva y registra el cambio. */
    editarReserva: (cambios: { id: string; p: Partial<Reserva> }[], accion = 'Se realizaron cambios generales en la reserva.', antes = '-', despues = '-') => mut(x => {
      const reservas = x.reservas.map(r => { const c = cambios.find(y => y.id === r.id); return c ? { ...r, ...c.p } : r; });
      const r0 = x.reservas.find(r => r.id === cambios[0]?.id);
      return r0 ? log({ ...x, reservas }, claveDe(r0), accion, antes, despues) : x;
    }),
    enviarMensaje: (clave: string, m: Omit<MensajeRes, 'id' | 'fecha'>) => mut(x => log({ ...x, mensajesRes: { ...x.mensajesRes, [clave]: [...(x.mensajesRes[clave] ?? []), { ...m, id: uid('m'), fecha: ahora() }] } }, clave, 'Mensaje enviado', '-', `${m.remitente} → ${m.destinatario}`)),
    guardarPreasignacion: (p: Preasignacion) => mut(x => ({ ...x, preasignaciones: x.preasignaciones.some(y => y.id === p.id) ? x.preasignaciones.map(y => (y.id === p.id ? p : y)) : [...x.preasignaciones, p] })),
    quitarPreasignacion: (id: string) => mut(x => ({ ...x, preasignaciones: x.preasignaciones.filter(y => y.id !== id) })),
  };
}

// ── Contratos: cupos por tipo de habitación ─────────────────────────────────
/** Cupo contratado por tipo de habitación (0 = sin cupo). */
export const CUPOS: Record<string, { grupo: string; cupos: number }> = {
  BOOKING: { grupo: 'OTA´s', cupos: 2 },
  EXPEDIA: { grupo: 'OTA´s', cupos: 2 },
  DESPEGAR: { grupo: 'Agencias', cupos: 1 },
  HOTELBEDS: { grupo: 'Agencias', cupos: 1 },
  CORP: { grupo: 'Corporativo', cupos: 2 },
  DIR: { grupo: 'Directo', cupos: 0 },
};
/** Grupos de disponibilidad (agrupan tipos de habitación). */
export const GRUPOS_DISP = [
  { id: 'EST', nombre: 'Estándar y superiores', tipos: ['STD', 'SUP'] },
  { id: 'DLX', nombre: 'Deluxe y familiares', tipos: ['DLX', 'FAM'] },
  { id: 'STE', nombre: 'Suites', tipos: ['JRS'] },
];
