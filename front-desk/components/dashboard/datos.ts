'use client';
// Cálculos del Dashboard: métricas por día, operación, disponibilidad, forecast, contratos y exportación.
import { fmtNum } from '@/components/suite/tokens';
import { estadoTarea } from '@/components/hotel/store';
import { CONTRATOS, HOY, TIPOS, contratoDeTarifa, fmtF, sumarDias, tareaAbierta, type DatosHotel, type Reserva } from '@/components/hotel/datos';
import { cuentaOcupacion } from '@/components/hotel/reservas';

// ── Métricas (calculadas a partir de las reservas) ──────────────────────────
export const noche = (rs: Reserva[], d: string) => rs.filter(r => cuentaOcupacion(r) && r.habitacion && r.entrada <= d && r.salida > d);
export function metricas(d: DatosHotel, dia: string) {
  const rs = noche(d.reservas, dia);
  const ingresos = rs.reduce((s, r) => s + r.precio, 0);
  const ocupadas = new Set(rs.map(r => r.habitacion)).size;
  const personas = rs.reduce((s, r) => s + r.adultos + r.ninos, 0);
  const total = d.habitaciones.length;
  return { ingresos, ocupadas, personas, total, adr: ocupadas ? ingresos / ocupadas : 0, revpar: ingresos / total, revpor: personas ? ingresos / personas : 0, ocupacion: ocupadas / total, bloqueadas: dia === HOY ? d.habitaciones.filter(h => h.estado === 'bloqueada').length : 0 };
}
export const rango = (a: string, b: string) => { const out: string[] = []; for (let x = a; x <= b && out.length < 400; x = sumarDias(x, 1)) out.push(x); return out; };
export function promedio(d: DatosHotel, dias: string[]) {
  const ms = dias.map(x => metricas(d, x));
  const ing = ms.reduce((s, m) => s + m.ingresos, 0), occ = ms.reduce((s, m) => s + m.ocupadas, 0), per = ms.reduce((s, m) => s + m.personas, 0), tot = ms.reduce((s, m) => s + m.total, 0);
  return { ingresos: ing, adr: occ ? ing / occ : 0, revpar: tot ? ing / tot : 0, revpor: per ? ing / per : 0, ocupacion: tot ? occ / tot : 0 };
}
export const variacion = (a: number, b: number) => (b ? ((a - b) / b) * 100 : 0);

// ── Rango de las tarjetas (1D · 7D · 1M · 1Y · Custom) ───────────────────────
export type Rango = '1D' | '7D' | '1M' | '1Y' | 'Custom';
export interface RangoSel { r: Rango; desde: string; hasta: string }
export const fmtCorto = (n: number) => (Math.abs(n) >= 1000 ? `${fmtNum(n / 1000, n >= 10000 ? 0 : 1)}K` : fmtNum(n, 0));

// ── Página ──────────────────────────────────────────────────────────────────
export const REPORTES_RAPIDOS = ['Informe Diario', 'Estado de Habitaciones', 'Ocupación por Nacionalidades', 'Mano corriente de Hoy', 'Caja del Día', 'Facturación del Día'] as const;
export type ReporteRapido = (typeof REPORTES_RAPIDOS)[number];

/** Noches de la tabla de Disponibilidad a partir del día actual. */
export function diasDisponibilidad(dia: string, r: RangoSel) {
  if (r.r === 'Custom') return rango(r.desde, r.hasta);
  const n = { '1D': 1, '7D': 7, '1M': 30, '1Y': 365 }[r.r];
  return rango(dia, sumarDias(dia, n - 1));
}
/** Días (o meses, en 1Y) del gráfico de ingresos que terminan en el día actual. */
export function diasIngresos(dia: string, r: RangoSel) {
  if (r.r === 'Custom') return rango(r.desde, r.hasta);
  const n = { '1D': 0, '7D': 7, '1M': 29, '1Y': 364 }[r.r];
  return rango(sumarDias(dia, -n), dia);
}

// ── Exportación de lo visible en cada pestaña ───────────────────────────────
type SeccionExp = { titulo: string; headers: string[]; filas: (string | number)[][] };
export function exportFinanciero(h: DatosHotel, dia: string, dias: string[]): { titulo: string; secciones: SeccionExp[] } {
  const m = metricas(h, dia);
  const fc = forecast(h, dia);
  return { titulo: 'Dashboard financiero', secciones: [
    { titulo: `KPIs principales (${fmtF(dia)})`, headers: ['Indicador', 'Valor'], filas: [['ADR', fmtNum(m.adr)], ['RevPAR', fmtNum(m.revpar)], ['RevPOR', fmtNum(m.revpor)], ['Ocupación %', fmtNum(m.ocupacion * 100, 1)], ['Ingresos diarios', fmtNum(m.ingresos)]] },
    { titulo: 'Ingresos totales en el tiempo', headers: ['Fecha', 'Ingresos (USD)'], filas: dias.map(d => [fmtF(d), fmtNum(metricas(h, d).ingresos)]) },
    { titulo: 'Forecast (próximos 7 días)', headers: ['Indicador', 'Valor'], filas: [['Ingresos proyectados', fmtNum(fc.ingresos)], ['Ocupación proyectada %', fmtNum(fc.ocupacion * 100, 1)], ['Reservas esperadas', fc.reservas]] },
    { titulo: 'Contratos (top 5 del mes)', headers: ['Contrato', 'Tipo', 'Importe', 'Aporte %', 'Vs. mes ant. %'], filas: topContratos(h, dia).map(c => [c.nombre, c.tipo, fmtNum(c.importe), fmtNum(c.aporte, 2), fmtNum(c.vs, 2)]) },
  ] };
}
export function exportOperativo(h: DatosHotel, dia: string, dias: string[]): { titulo: string; secciones: SeccionExp[] } {
  const o = operacion(h, dia);
  return { titulo: 'Dashboard operativo', secciones: [
    { titulo: `Llegadas y salidas (${fmtF(dia)})`, headers: ['Concepto', 'Cantidad'], filas: [['Llegadas esperadas', o.esperadas], ['Llegadas listas', o.listasIn], ['Salidas pendientes', o.pendOut], ['Salidas listas', o.listasOut]] },
    { titulo: 'Habitaciones', headers: ['Concepto', 'Cantidad'], filas: [['Libres', o.libres], ['Ocupadas', o.ocupadas], ['Bloqueadas', o.bloqueadas], ['Limpias', o.total - o.sucias], ['Sucias', o.sucias]] },
    { titulo: 'Tareas urgentes', headers: ['Tipo', 'Tarea', 'Vencimiento', 'Estado', 'Responsable'], filas: o.urgentes.map(t => [t.tipo, t.tarea, fmtF(t.vencimiento), t.estado, t.responsable]) },
    { titulo: 'Disponibilidad', headers: ['Día', ...TIPOS.map(t => t.codigo)], filas: dias.slice(0, 92).map(d => [fmtF(d), ...TIPOS.map(t => disponibles(h, t.id, d))]) },
    { titulo: 'Alertas', headers: ['Módulo', 'Alerta'], filas: h.alertas.map(a => [a.modulo, a.texto]) },
  ] };
}

// ── Cálculos ────────────────────────────────────────────────────────────────
export function operacion(h: DatosHotel, dia: string) {
  const esperadas = h.reservas.filter(r => r.entrada === dia && (r.estado === 'Confirmada' || r.estado === 'Solicitada')).length;
  const listasIn = h.reservas.filter(r => r.checkinEn === dia).length;
  const pendOut = h.reservas.filter(r => r.salida === dia && r.estado === 'In-House').length;
  const listasOut = h.reservas.filter(r => r.checkoutEn === dia).length;
  const total = h.habitaciones.length;
  const hoy = dia === HOY;
  const ocupadas = hoy ? h.habitaciones.filter(x => x.estado === 'ocupada' || x.estado === 'checkout').length : new Set(noche(h.reservas, dia).map(r => r.habitacion)).size;
  const bloqueadas = hoy ? h.habitaciones.filter(x => x.estado === 'bloqueada').length
    : new Set(h.tareas.filter(t => t.bloqueo && tareaAbierta(t) && t.bloqueo.inicio <= dia && t.bloqueo.fin >= dia).flatMap(t => t.bloqueo!.habitaciones)).size;
  const sucias = h.habitaciones.filter(x => x.sucia).length;
  const tareas = h.tareas.map(t => ({ ...t, estado: estadoTarea(t) }));
  const urgentes = tareas.filter(t => tareaAbierta(t) && t.vencimiento <= sumarDias(dia, 1)).sort((a, b) => a.vencimiento.localeCompare(b.vencimiento));
  return { esperadas, listasIn, pendOut, listasOut, total, ocupadas, bloqueadas, libres: Math.max(0, total - ocupadas - bloqueadas), sucias, tareas, urgentes };
}
export function disponibles(h: DatosHotel, tipo: string, d: string) {
  const habs = h.habitaciones.filter(x => x.tipo === tipo);
  const res = noche(h.reservas, d).filter(r => r.tipo === tipo).length;
  const b = d === HOY ? habs.filter(x => x.estado === 'bloqueada').length
    : h.tareas.filter(t => t.bloqueo && tareaAbierta(t) && t.bloqueo.inicio <= d && t.bloqueo.fin >= d).flatMap(t => t.bloqueo!.habitaciones).filter(n => habs.some(x => x.numero === n)).length;
  return habs.length - res - b;
}
export function forecast(h: DatosHotel, dia: string) {
  const prox = rango(sumarDias(dia, 1), sumarDias(dia, 7));
  const p = promedio(h, prox);
  const reservas = h.reservas.filter(r => (r.estado === 'Confirmada' || r.estado === 'Solicitada') && r.entrada > dia && r.entrada <= sumarDias(dia, 7)).length;
  return { ingresos: p.ingresos, ocupacion: p.ocupacion, reservas };
}
export function topContratos(h: DatosHotel, dia: string) {
  const ini = dia.slice(0, 8) + '01';
  const mes = rango(ini, dia), mesAnt = rango(sumarDias(ini, -30), sumarDias(ini, -1));
  const porMes = (dias: string[]) => { const m: Record<string, number> = {}; dias.forEach(d => noche(h.reservas, d).forEach(r => { const c = contratoDeTarifa(r.tarifa); m[c] = (m[c] ?? 0) + r.precio; })); return m; };
  const act = porMes(mes), ant = porMes(mesAnt);
  const total = Object.values(act).reduce((a, b) => a + b, 0) || 1;
  return CONTRATOS.map(c => ({ ...c, importe: act[c.nombre] ?? 0, aporte: ((act[c.nombre] ?? 0) / total) * 100, vs: variacion(act[c.nombre] ?? 0, ant[c.nombre] ?? 0) }))
    .sort((a, b) => b.importe - a.importe).slice(0, 5);
}
