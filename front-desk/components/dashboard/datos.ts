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

// ── Período de las tarjetas (atajos relativos al día actual o rango personalizado) ──
export type Sentido = 'futuro' | 'pasado';
export interface Atajo { id: string; label: string; calc: (dia: string) => [string, string] }
const finMes = (d: string) => { const f = new Date(d + 'T12:00:00'); return `${d.slice(0, 7)}-${String(new Date(f.getFullYear(), f.getMonth() + 1, 0).getDate()).padStart(2, '0')}`; };
const inicioSemana = (d: string) => { const f = new Date(d + 'T12:00:00'); return sumarDias(d, -((f.getDay() + 6) % 7)); };
export const ATAJOS: Record<Sentido, Atajo[]> = {
  futuro: [
    { id: 'hoy', label: 'Día actual', calc: d => [d, d] },
    { id: 'p7', label: 'Próximos 7 días', calc: d => [d, sumarDias(d, 6)] },
    { id: 'p28', label: 'Próximos 28 días', calc: d => [d, sumarDias(d, 27)] },
    { id: 'p90', label: 'Próximos 90 días', calc: d => [d, sumarDias(d, 89)] },
    { id: 'semana', label: 'Esta semana', calc: d => [inicioSemana(d), sumarDias(inicioSemana(d), 6)] },
    { id: 'mes', label: 'Este mes', calc: d => [d.slice(0, 8) + '01', finMes(d)] },
    { id: 'anio', label: 'Este año', calc: d => [d.slice(0, 5) + '01-01', d.slice(0, 5) + '12-31'] },
  ],
  pasado: [
    { id: 'hoy', label: 'Día actual', calc: d => [d, d] },
    { id: 'u7', label: 'Últimos 7 días', calc: d => [sumarDias(d, -6), d] },
    { id: 'u28', label: 'Últimos 28 días', calc: d => [sumarDias(d, -27), d] },
    { id: 'u90', label: 'Últimos 90 días', calc: d => [sumarDias(d, -89), d] },
    { id: 'semana', label: 'Esta semana', calc: d => [inicioSemana(d), d] },
    { id: 'mes', label: 'Este mes', calc: d => [d.slice(0, 8) + '01', d] },
    { id: 'anio', label: 'Este año', calc: d => [d.slice(0, 5) + '01-01', d] },
  ],
};
const finSemana = (d: string) => sumarDias(inicioSemana(d), 6);
const sigMes1 = (d: string) => { const f = new Date(d + 'T12:00:00'); const n = new Date(f.getFullYear(), f.getMonth() + 1, 1); return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-01`; };
const finTrimestre = (d: string) => { const m = Number(d.slice(5, 7)); const fm = Math.ceil(m / 3) * 3; return finMes(`${d.slice(0, 5)}${String(fm).padStart(2, '0')}-01`); };
/** Atajos del filtro corto «Período de fecha» (Disponibilidad): desde hoy hacia adelante. */
export const ATAJOS_CORTOS: Atajo[] = [
  { id: 'c-hoy', label: 'Hoy', calc: d => [d, d] },
  { id: 'c-semana', label: 'Esta semana', calc: d => [d, finSemana(d)] },
  { id: 'c-mes', label: 'Este mes', calc: d => [d, finMes(d)] },
  { id: 'c-prox', label: 'Próximo mes', calc: d => [sigMes1(d), finMes(sigMes1(d))] },
  { id: 'c-trim', label: 'Este trimestre', calc: d => [d, finTrimestre(d)] },
  { id: 'c-anio', label: 'Este año', calc: d => [d, d.slice(0, 5) + '12-31'] },
];
/** `r` = id del atajo, o «personalizado» con `desde` / `hasta` fijos. */
export interface RangoSel { r: string; desde: string; hasta: string }
export const resolverRango = (dia: string, s: Sentido, r: RangoSel): [string, string] =>
  r.r === 'personalizado' ? [r.desde, r.hasta] : (ATAJOS[s].find(a => a.id === r.r) ?? ATAJOS_CORTOS.find(a => a.id === r.r) ?? ATAJOS[s][1]).calc(dia);
export const fmtCorto = (n: number) => (Math.abs(n) >= 1000 ? `${fmtNum(n / 1000, n >= 10000 ? 0 : 1)}K` : fmtNum(n, 0));

// ── Página ──────────────────────────────────────────────────────────────────
/** Menú «Reportes» del Dashboard: cada uno abre su pantalla. */
export const REPORTES_RAPIDOS: { label: string; href: string }[] = [
  { label: 'Informe diario', href: '/pronostico-estadisticas/reportes?r=diario' },
  { label: 'Estado de las habitaciones', href: '/ama-de-llaves/estado-de-habitaciones' },
  { label: 'Ocupación por nacionalidades', href: '/hospedaje/reportes?r=nacionalidades' },
  { label: 'Transacciones diarias', href: '/facturacion/transacciones-diarias' },
  { label: 'Caja del día', href: '/facturacion/caja' },
  { label: 'Histórico de folios', href: '/facturacion/historico-de-folios' },
];

/** Período inicial de Disponibilidad (y el que deja «Limpiar»). */
export const DISP_DEFECTO: RangoSel = { r: 'c-semana', desde: '', hasta: '' };
/** Noches de la tabla de Disponibilidad. */
export const diasDisponibilidad = (dia: string, r: RangoSel) => rango(...resolverRango(dia, 'futuro', r));
/** Días del gráfico de ingresos (se agrupan por mes si pasan de 62). */
export const diasIngresos = (dia: string, r: RangoSel) => rango(...resolverRango(dia, 'pasado', r));

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
