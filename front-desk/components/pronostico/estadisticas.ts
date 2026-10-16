// Cálculos de Pronóstico / Estadísticas a partir del store: ocupación por día
// (real o proyectada), ingresos por noche desglosados (alojamiento, régimen y
// otros), segmentos y resúmenes. Todo es determinista y se recalcula al vuelo.
import { HOY, TIPOS, noches, sumarDias, type BloqueoHab, type Habitacion, type Reserva, type Tarea } from '@/components/hotel/datos';
import { fechasEntre, bloqueadasEn } from '@/components/reservaciones/inventario';
import { CUPOS, mercadoDe } from '@/components/hotel/reservas';
import { prng } from '@/components/hotel/datos';

type H = { habitaciones: Habitacion[]; reservas: Reserva[]; tareas: Tarea[]; bloqueos?: BloqueoHab[] };
export const r2 = (n: number) => Math.round(n * 100) / 100;
export const pct = (a: number, b: number) => (b ? r2((a / b) * 100) : 0);
export const ocupaNoche = (r: Reserva, d: string) => r.entrada <= d && r.salida > d;

/** Real = lo efectivamente ocurrido (en casa / completadas); proyectado suma confirmadas (y solicitadas si se pide). */
export function cuenta(r: Reserva, modo: 'Real' | 'Proyectado', estados: string[] = ['Confirmada']) {
  if (r.estado === 'In-House' || r.estado === 'Completada') return true;
  return modo === 'Proyectado' && estados.includes(r.estado);
}

/** Ingreso por noche de una reserva: alojamiento sin régimen, régimen (desayuno, etc.) y otros cargos (prorrateados). */
export function ingresoNoche(r: Reserva) {
  const conDes = ['1.BB', 'DESI', 'MP', 'TI'].includes(r.regimen);
  const reg = conDes ? Math.min(r2(r.precio * (r.regimen === 'MP' ? 0.4 : r.regimen === 'TI' ? 0.5 : 0.3)), (r.regimen === 'MP' ? 25 : r.regimen === 'TI' ? 45 : 12) * r.adultos) : 0;
  const n = Math.max(1, noches(r.entrada, r.salida));
  const otros = r.cargos.reduce((s, c) => s + c.cantidad * c.precio * Math.max(1, noches(c.desde, c.hasta) || 1), 0) / n;
  return { aloj: r2(r.precio - reg), reg, otros: r2(otros), total: r2(r.precio + otros) };
}

/** Celda del pronóstico: un tipo en una fecha. */
export interface CeldaPron { tipo: string; total: number; fueraOrden: number; ocupadas: number; reservadas: number; libres: number; salidas: number; llegadas: number }
export interface OpcPron { estados: string[]; tarifa?: string; titulo?: string; modo: 'Real' | 'Proyectado'; fuente: 'Hotel' | 'Tarifa'; respetarCupos: boolean; respetarRelease: boolean }

export function pronostico(h: H, desde: string, hasta: string, o: OpcPron) {
  const filtra = (r: Reserva) => (!o.tarifa || r.tarifa === o.tarifa) && (!o.titulo || `${r.grupo ?? ''} ${r.empresa} ${r.nombre} ${r.numero}`.toLowerCase().includes(o.titulo.toLowerCase()));
  return fechasEntre(desde, hasta).map(d => {
    const bloq = bloqueadasEn(h.habitaciones, h.tareas, d, h.bloqueos);
    const delDia = h.reservas.filter(r => r.habitacion !== undefined && ocupaNoche(r, d) && filtra(r));
    const cupo = o.tarifa ? CUPOS[o.tarifa] : undefined;
    const liberado = !!cupo && o.respetarRelease && cupo.release > 0 && noches(HOY, d) < cupo.release;
    const celdas: CeldaPron[] = TIPOS.map(t => {
      const habs = h.habitaciones.filter(x => x.tipo === t.id);
      const fueraOrden = habs.filter(x => bloq.has(x.numero)).length;
      const rs = delDia.filter(r => r.tipo === t.id);
      const ocupadas = rs.filter(r => r.estado === 'In-House' || r.estado === 'Completada').length;
      const reservadas = o.modo === 'Real' ? 0 : rs.filter(r => o.estados.includes(r.estado) && r.estado !== 'In-House' && r.estado !== 'Completada').length;
      const salidas = h.reservas.filter(r => r.tipo === t.id && r.salida === d && filtra(r) && (r.estado === 'In-House' || r.estado === 'Completada' || o.estados.includes(r.estado))).length;
      const llegadas = h.reservas.filter(r => r.tipo === t.id && r.entrada === d && filtra(r) && (r.estado === 'In-House' || r.estado === 'Completada' || o.estados.includes(r.estado))).length;
      let total = habs.length;
      let libres = total - fueraOrden - ocupadas - reservadas;
      if (o.fuente === 'Tarifa' && cupo) { total = cupo.cupos; libres = liberado ? 0 : cupo.cupos - ocupadas - reservadas; }
      else if (o.respetarCupos && cupo) libres = Math.min(libres, liberado ? 0 : cupo.cupos - ocupadas - reservadas);
      else if (liberado) libres = Math.min(libres, 0);
      return { tipo: t.id, total, fueraOrden, ocupadas, reservadas, libres, salidas, llegadas };
    });
    const total = celdas.reduce((s, c) => s + c.total, 0);
    const libres = celdas.reduce((s, c) => s + c.libres, 0);
    const ocup = celdas.reduce((s, c) => s + c.ocupadas + c.reservadas, 0);
    return { fecha: d, celdas, total, libres, ocupadas: ocup, pct: pct(ocup, total) };
  });
}

/** Ocupación y producción por día (para ocupación acumulada, regímenes e ingresos). */
export function porDia(h: H, desde: string, hasta: string, modo: 'Real' | 'Proyectado') {
  const total = h.habitaciones.length;
  return fechasEntre(desde, hasta).map(d => {
    // «Real» solo existe hasta la fecha hotelera; lo posterior es pronóstico
    const rs = modo === 'Real' && d > HOY ? [] : h.reservas.filter(r => r.habitacion && ocupaNoche(r, d) && cuenta(r, modo));
    const ing = rs.map(ingresoNoche);
    const aloj = r2(ing.reduce((s, x) => s + x.aloj, 0)), reg = r2(ing.reduce((s, x) => s + x.reg, 0)), otros = r2(ing.reduce((s, x) => s + x.otros, 0));
    return { fecha: d, rs, cant: rs.length, pax: rs.reduce((s, r) => s + r.adultos + r.ninos, 0), pct: pct(rs.length, total), aloj, reg, otros, total };
  });
}

/** Grupo comercial de una reserva (agencia / contrato o Directo). */
export const segmentoDe = (r: Reserva) => (r.cliente === 'Huésped Individual' ? 'Directo' : r.empresa || 'Directo');
export { mercadoDe };

/** Ingresos mensuales del año: real (completadas), pronosticado (futuro) y año anterior (histórico sintético determinista). */
export function ingresosMensuales(h: H, anio: number) {
  const rnd = prng(anio * 31);
  const base = h.habitaciones.length * 30 * 150;
  return Array.from({ length: 12 }, (_, m) => {
    const ini = `${anio}-${String(m + 1).padStart(2, '0')}-01`;
    const fin = sumarDias(m === 11 ? `${anio + 1}-01-01` : `${anio}-${String(m + 2).padStart(2, '0')}-01`, -1);
    let real = 0, pron = 0;
    fechasEntre(ini, fin).forEach(d => {
      h.reservas.filter(r => r.habitacion && ocupaNoche(r, d)).forEach(r => {
        const v = ingresoNoche(r).total / 1.13;
        if (d < HOY && (r.estado === 'Completada' || r.estado === 'In-House')) real += v;
        else if (d >= HOY && (r.estado === 'Confirmada' || r.estado === 'In-House' || r.estado === 'Solicitada')) pron += v;
      });
    });
    // Meses fuera de la ventana de datos de ejemplo: histórico sintético (antes de la ventana) para que el informe tenga contexto
    const ventana = sumarDias(HOY, -65);
    if (fin < ventana) real = base * (0.55 + rnd() * 0.3);
    const anterior = base * (0.5 + rnd() * 0.35);
    const anteriorPron = m >= Number(HOY.slice(5, 7)) - 1 ? anterior * (0.1 + rnd() * 0.3) : 0;
    return { mes: m, real: r2(real), pron: r2(pron), anterior: r2(anterior), anteriorPron: r2(anteriorPron) };
  });
}
