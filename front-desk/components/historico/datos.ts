// Datos de Histórico: bitácora de cambios, mensajes a huéspedes y no-shows. Se arman a partir de las reservas
// del hotel (datos de ejemplo en memoria) para que cada registro apunte a una reserva real.
import { HOY, TARIFAS_NOMBRES, USUARIOS, sumarDias, type Reserva } from '@/components/hotel/datos';

/** Evento de la bitácora de una reserva (lo que se registra al trabajar en el sistema). */
export interface EventoBitacora { id: string; fecha: string; usuario: string; accion: string; antes: string; despues: string }

export const TIPOS_CAMBIO = ['Cambio de habitación', 'Traslado de cargos', 'Prórroga', 'Acortamiento', 'Cambio de tarifa o condiciones', 'Cambio de datos del huésped', 'Check-in anulado', 'Anulación de reserva', 'Otros cambios de la reserva'] as const;
export type TipoCambio = (typeof TIPOS_CAMBIO)[number];

export interface Cambio {
  id: string; fecha: string; hora: string; tipo: TipoCambio; reservaId: string; numero: string; habitacion: string; huesped: string;
  antes: string; despues: string; motivo: string; usuario: string;
}

export interface Mensaje {
  id: string; reservaId: string; numero: string; habitacion: string; huesped: string; entrada: string; salida: string;
  de: string; responderA: string; texto: string; fecha: string; hora: string; registradoPor: string; modificadoPor: string;
  estado: 'Activo' | 'Eliminado' | 'Recuperado';
}

export interface NoShow { id: string; numero: string; nombre: string; nacionalidad: string; entrada: string; salida: string; habitaciones: number; tarifa: string; empresa: string; deposito: number }

const fmtD = (d: string) => d.split('-').reverse().join('/');
/** Número pseudoaleatorio estable a partir de un texto (los datos de ejemplo no cambian entre recargas). */
const semilla = (s: string) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
const de = <T,>(xs: readonly T[], s: string, k = 0) => xs[(semilla(s) + k) % xs.length];
const horaDe = (s: string) => { const n = semilla(s); return `${String(7 + (n % 14)).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`; };

/** Tipo de cambio según el texto del evento de la reserva. */
const tipoDe = (accion: string): TipoCambio => {
  const a = accion.toLowerCase();
  if (a.includes('anul')) return a.includes('check') ? 'Check-in anulado' : 'Anulación de reserva';
  if (a.includes('habitaci')) return 'Cambio de habitación';
  if (a.includes('traslad')) return 'Traslado de cargos';
  if (a.includes('tarifa') || a.includes('precio') || a.includes('régimen') || a.includes('crédito')) return 'Cambio de tarifa o condiciones';
  if (a.includes('huésped') || a.includes('perfil') || a.includes('nombre')) return 'Cambio de datos del huésped';
  return 'Otros cambios de la reserva';
};

/** Bitácora: lo registrado en las reservas mientras se trabaja + cambios de ejemplo + anulaciones. */
export function bitacora(reservas: Reserva[], eventos: Record<string, EventoBitacora[]> = {}): Cambio[] {
  const out: Cambio[] = [];
  Object.entries(eventos).forEach(([clave, evs]) => {
    const r = reservas.find(x => (x.grupo ?? x.id) === clave);
    if (!r) return;
    evs.forEach(e => out.push({ id: e.id, fecha: e.fecha.slice(0, 10), hora: e.fecha.slice(11, 16), tipo: tipoDe(e.accion), reservaId: r.id, numero: r.numero, habitacion: r.habitacion || '—', huesped: r.nombre,
      antes: e.antes === '-' ? '—' : e.antes, despues: e.despues === '-' ? e.accion : e.despues, motivo: e.despues === '-' ? '' : e.accion, usuario: e.usuario }));
  });
  const base = (r: Reserva, tipo: TipoCambio, fecha: string, antes: string, despues: string, motivo = '', usuario?: string): Cambio => ({
    id: `${r.id}-${tipo}-${fecha}`, fecha, hora: horaDe(r.id + tipo), tipo, reservaId: r.id, numero: r.numero, habitacion: r.habitacion || '—', huesped: r.nombre,
    antes, despues, motivo, usuario: usuario ?? de(USUARIOS, r.id + tipo),
  });
  const conHab = reservas.filter(r => r.habitacion && r.estado !== 'Anulada');
  conHab.forEach((r, i) => {
    const desde = r.entrada <= HOY ? r.entrada : sumarDias(HOY, -2);
    const k = semilla(r.id) % 7;
    if (k === 0) out.push(base(r, 'Cambio de habitación', desde, `Hab. ${String(Number(r.habitacion) - 1)}`, `Hab. ${r.habitacion}`, de(['Aire acondicionado no enfría', 'Solicitud del huésped', 'Ruido en la habitación'], r.id)));
    if (k === 1) out.push(base(r, 'Prórroga', sumarDias(r.salida, -1) <= HOY ? sumarDias(r.salida, -1) : desde, `Salida ${fmtD(sumarDias(r.salida, -1))}`, `Salida ${fmtD(r.salida)}`, 'El huésped extiende la estadía'));
    if (k === 2) out.push(base(r, 'Cambio de tarifa o condiciones', desde, `${de(TARIFAS_NOMBRES, r.id, 1)} · $ ${(r.precio + 15).toFixed(2)}`, `${r.tarifa} · $ ${r.precio.toFixed(2)}`, 'Tarifa del contrato'));
    if (k === 3) out.push(base(r, 'Cambio de datos del huésped', desde, `Correo: ${r.email ? r.email.replace(/@.*/, '@gmail.com') : 'sin correo'}`, `Correo: ${r.email || 'actualizado'}`, 'Corrección en recepción'));
    if (k === 4 && r.cuentas.length) out.push(base(r, 'Traslado de cargos', desde, `Hab. ${r.habitacion} · ${r.cuentas[0].nombre}`, `Hab. ${r.habitacion} · Cuenta de consumo`, de(['Cargo de restaurante a la cuenta personal', 'Minibar a la cuenta de consumo'], r.id)));
    if (k === 5 && i % 2) out.push(base(r, 'Acortamiento', desde, `Salida ${fmtD(sumarDias(r.salida, 1))}`, `Salida ${fmtD(r.salida)}`, 'Salida anticipada'));
    if (k === 6 && i % 3 === 0) out.push(base(r, 'Check-in anulado', desde, 'In-House', 'Confirmada', 'Check-in registrado en la habitación equivocada'));
  });
  reservas.filter(r => r.anulacion).forEach(r => out.push({ ...base(r, 'Anulación de reserva', r.anulacion!.fecha.slice(0, 10), r.estado === 'Anulada' ? 'Confirmada' : r.estado, 'Anulada', r.anulacion!.motivo, r.anulacion!.usuario), hora: r.anulacion!.fecha.slice(11, 16) || horaDe(r.id) }));
  return out.sort((a, b) => `${b.fecha} ${b.hora}`.localeCompare(`${a.fecha} ${a.hora}`));
}

const TEXTOS = [
  ['Recepción', 'Llamar a la agencia para confirmar el traslado de mañana.'],
  ['Restaurante', 'Mesa reservada para 4 personas a las 7:30 p. m.'],
  ['Spa', 'Confirmar masaje en pareja para el día de salida.'],
  ['Familiar', 'Su hermano llegará al lobby a las 3:00 p. m.'],
  ['Agencia', 'El voucher del tour fue enviado a su correo.'],
  ['Mantenimiento', 'La caja fuerte ya quedó reparada.'],
] as const;

/** Mensajes de ejemplo para huéspedes en casa y salidas recientes. */
export function mensajes(reservas: Reserva[]): Mensaje[] {
  return reservas.filter(r => r.habitacion && (r.estado === 'In-House' || r.estado === 'Completada') && semilla(r.id) % 3 !== 1).slice(0, 30).map((r, i) => {
    const [deQuien, texto] = de(TEXTOS, r.id);
    const fecha = r.entrada <= HOY ? r.entrada : HOY;
    const registro = de(USUARIOS, r.id, 2);
    return {
      id: `msg-${r.id}`, reservaId: r.id, numero: r.numero, habitacion: r.habitacion, huesped: r.nombre, entrada: r.entrada, salida: r.salida,
      de: deQuien, responderA: i % 3 === 0 ? 'Ext. 101' : i % 3 === 1 ? r.telefono || 'Recepción' : 'Recepción', texto, fecha, hora: horaDe(r.id + 'm'),
      registradoPor: registro, modificadoPor: i % 4 === 0 ? de(USUARIOS, r.id, 3) : registro, estado: i % 9 === 4 ? 'Eliminado' : i % 11 === 6 ? 'Recuperado' : 'Activo',
    };
  });
}

/** No-shows: reservas marcadas como No-Show y ejemplos del último mes. */
export function noShows(reservas: Reserva[]): NoShow[] {
  const reales = reservas.filter(r => r.estado === 'No-Show').map(r => ({ id: r.id, numero: r.numero, nombre: r.nombre, nacionalidad: r.nacionalidad, entrada: r.entrada, salida: r.salida, habitaciones: 1, tarifa: r.tarifa, empresa: r.empresa, deposito: r.depGarantia }));
  const ejemplos: NoShow[] = [
    ['RE-3981', 'Michael Turner', 'USA', -27, 3, 1, 'BOOKING', 'Booking.com', 0],
    ['RL-3990', 'Grupo Andes Travel', 'ARG', -21, 2, 3, 'AGENCIAS FITS', 'Andes Travel', 450],
    ['RE-4012', 'Sophie Laurent', 'FRA', -15, 4, 1, 'EXPEDIA', 'Expedia', 0],
    ['RE-4031', 'Carlos Méndez Rojas', 'CRI', -9, 1, 1, 'DIR', '', 120],
    ['RE-4044', 'Hannah Schmidt', 'ALE', -6, 5, 2, 'BOOKING', 'Booking.com', 0],
    ['RL-4050', 'Costa Rica Vacations', 'USA', -3, 3, 1, 'AGENCIAS FITS', 'Costa Rica Vacations', 300],
  ].map(([numero, nombre, nac, d, n, hab, tarifa, empresa, dep]) => {
    const entrada = sumarDias(HOY, d as number);
    return { id: `ns-${numero}`, numero: numero as string, nombre: nombre as string, nacionalidad: nac as string, entrada, salida: sumarDias(entrada, n as number), habitaciones: hab as number, tarifa: tarifa as string, empresa: empresa as string, deposito: dep as number };
  });
  return [...reales, ...ejemplos];
}
