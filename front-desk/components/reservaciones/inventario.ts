// Inventario por día y tipo de habitación: base de «Disponibilidad de cupos»,
// «Pronóstico por tipo de habitación» (Reservaciones y Pronóstico/Estadísticas)
// y del Planificador. Todo se calcula del store, así que refleja al instante
// las reservas nuevas, anulaciones, check-outs y bloqueos.
import { HOY, TIPOS, sumarDias, tareaAbierta, type BloqueoHab, type Habitacion, type Reserva, type Tarea } from '@/components/hotel/datos';
import { bloqueaHabitacion, cuentaOcupacion } from '@/components/hotel/reservas';

export interface DiaTipo { tipo: string; total: number; ocupadas: number; solicitadas: number; bloqueadas: number; libres: number; pct: number; ingreso: number; llegadas: number; salidas: number; pax: number }
export interface DiaInventario { fecha: string; porTipo: DiaTipo[]; total: DiaTipo }

export const fechasEntre = (desde: string, hasta: string) => {
  const out: string[] = [];
  for (let d = desde; d <= hasta && out.length < 400; d = sumarDias(d, 1)) out.push(d);
  return out;
};
/** ¿La reserva ocupa la noche `d`? */
export const ocupaNoche = (r: Reserva, d: string) => r.entrada <= d && r.salida > d;

/** ¿El bloqueo manual cubre la fecha `d`? (`hasta` vacío = indefinido) */
export const bloqueoCubre = (b: BloqueoHab, d: string) => b.desde <= d && (!b.hasta || b.hasta >= d);
/** ¿El bloqueo manual se cruza con el rango [desde, hasta]? */
export const bloqueoCruza = (b: { desde: string; hasta: string }, desde: string, hasta: string) => b.desde <= hasta && (!b.hasta || b.hasta >= desde);

/** Habitaciones fuera de servicio en una fecha (bloqueo del mapa hoy + bloqueos de Ama de llaves + bloqueos de tareas). */
export function bloqueadasEn(habs: Habitacion[], tareas: Tarea[], d: string, bloqueos: BloqueoHab[] = []) {
  const s = new Set<string>();
  const nums = new Set(habs.map(h => h.numero));
  if (d === HOY) habs.filter(h => h.estado === 'bloqueada').forEach(h => s.add(h.numero));
  bloqueos.forEach(b => { if (nums.has(b.habitacion) && bloqueoCubre(b, d)) s.add(b.habitacion); });
  tareas.forEach(t => { if (t.bloqueo && tareaAbierta(t) && t.bloqueo.inicio <= d && t.bloqueo.fin >= d) t.bloqueo.habitaciones.forEach(n => { if (nums.has(n)) s.add(n); }); });
  return s;
}
/** ¿La habitación está bloqueada en alguna noche de la estancia [entrada, salida)? */
export function bloqueadaEnEstancia(h: { habitaciones: Habitacion[]; tareas: Tarea[]; bloqueos: BloqueoHab[] }, num: string, entrada: string, salida: string) {
  const ultima = sumarDias(salida, -1) < entrada ? entrada : sumarDias(salida, -1);
  if (entrada <= HOY && h.habitaciones.find(x => x.numero === num)?.estado === 'bloqueada') return true;
  if (h.bloqueos.some(b => b.habitacion === num && bloqueoCruza(b, entrada, ultima))) return true;
  return h.tareas.some(t => t.bloqueo && tareaAbierta(t) && t.bloqueo.habitaciones.includes(num) && t.bloqueo.inicio <= ultima && t.bloqueo.fin >= entrada);
}

export interface OpcionesInventario { tarifa?: string; incluirSolicitadas?: boolean; tipos?: string[] }

export function inventario(h: { habitaciones: Habitacion[]; reservas: Reserva[]; tareas: Tarea[]; bloqueos?: BloqueoHab[] }, desde: string, hasta: string, o: OpcionesInventario = {}): DiaInventario[] {
  const tipos = (o.tipos?.length ? TIPOS.filter(t => o.tipos!.includes(t.id)) : TIPOS);
  const vivas = h.reservas.filter(r => (cuentaOcupacion(r) || (o.incluirSolicitadas !== false && r.estado === 'Solicitada')));
  return fechasEntre(desde, hasta).map(d => {
    const bloq = bloqueadasEn(h.habitaciones, h.tareas, d, h.bloqueos);
    const delDia = vivas.filter(r => ocupaNoche(r, d) && (!o.tarifa || r.tarifa === o.tarifa));
    const porTipo = tipos.map(t => {
      const total = h.habitaciones.filter(x => x.tipo === t.id).length;
      const rs = delDia.filter(r => r.tipo === t.id);
      const ocupadas = rs.filter(r => r.estado !== 'Solicitada').length;
      const solicitadas = rs.filter(r => r.estado === 'Solicitada').length;
      const bloqueadas = h.habitaciones.filter(x => x.tipo === t.id && bloq.has(x.numero)).length;
      const libres = total - ocupadas - solicitadas - bloqueadas;
      const llegadas = h.reservas.filter(r => r.tipo === t.id && r.entrada === d && (cuentaOcupacion(r) || r.estado === 'Solicitada')).length;
      const salidas = h.reservas.filter(r => r.tipo === t.id && r.salida === d && (cuentaOcupacion(r))).length;
      return {
        tipo: t.id, total, ocupadas, solicitadas, bloqueadas, libres, pct: total ? Math.round(((ocupadas + solicitadas) / Math.max(1, total - bloqueadas)) * 1000) / 10 : 0,
        ingreso: rs.filter(r => r.estado !== 'Solicitada').reduce((s, r) => s + r.precio, 0), llegadas, salidas, pax: rs.reduce((s, r) => s + r.adultos + r.ninos, 0),
      };
    });
    const sum = (k: keyof DiaTipo) => porTipo.reduce((s, x) => s + (x[k] as number), 0);
    const total: DiaTipo = { tipo: 'TOTAL', total: sum('total'), ocupadas: sum('ocupadas'), solicitadas: sum('solicitadas'), bloqueadas: sum('bloqueadas'), libres: sum('libres'), pct: 0, ingreso: sum('ingreso'), llegadas: sum('llegadas'), salidas: sum('salidas'), pax: sum('pax') };
    total.pct = total.total ? Math.round(((total.ocupadas + total.solicitadas) / Math.max(1, total.total - total.bloqueadas)) * 1000) / 10 : 0;
    return { fecha: d, porTipo, total };
  });
}

/** Libres por tipo en todo un rango (mínimo diario): lo que se puede vender para esa estancia. */
export function libresEnRango(h: { habitaciones: Habitacion[]; reservas: Reserva[]; tareas: Tarea[]; bloqueos?: BloqueoHab[] }, entrada: string, salida: string, ignorar: string[] = []) {
  const hasta = sumarDias(salida, -1);
  const r = { ...h, reservas: h.reservas.filter(x => !ignorar.includes(x.id)) };
  const dias = inventario(r, entrada, hasta < entrada ? entrada : hasta);
  return Object.fromEntries(TIPOS.map(t => [t.id, Math.min(...dias.map(d => d.porTipo.find(x => x.tipo === t.id)!.libres))])) as Record<string, number>;
}
export { bloqueaHabitacion };
