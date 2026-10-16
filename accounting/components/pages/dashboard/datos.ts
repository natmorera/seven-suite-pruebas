'use client';
import { useEffect } from 'react';
import { FONT, C } from '../../ui/tokens';
import { USUARIOS_INIT } from '../config/permissionsData';

export const BRAND = '#A77600';
export const F = FONT;
export function useChartJS(cb: () => void, deps: any[] = []) {
  useEffect(() => {
    cb();
  }, deps); // eslint-disable-line
}
// ── Calendar helpers ──────────────────────────────────────────────────────────
export const MONTHS_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
export const DAYS_ES   = ['D','L','M','X','J','V','S'];
export function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}
export function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}
export function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}
export function parseDate(s: string): Date | null {
  const d = new Date(s + 'T12:00:00');
  return isNaN(d.getTime()) ? null : d;
}
export function addMonths(year: number, month: number, delta: number) {
  const d = new Date(year, month + delta, 1);
  return { year: d.getFullYear(), month: d.getMonth() };
}
// preset → {from, to} in ISO
export function presetRange(label: string): { from: string; to: string } {
  const today = new Date();
  const iso = isoDate(today);
  function sub(days: number) {
    const d = new Date(today); d.setDate(d.getDate() - days); return isoDate(d);
  }
  function startOf(unit: 'week' | 'month' | 'year') {
    const d = new Date(today);
    if (unit === 'week') d.setDate(d.getDate() - d.getDay());
    else if (unit === 'month') d.setDate(1);
    else { d.setMonth(0); d.setDate(1); }
    return isoDate(d);
  }
  switch (label) {
    case 'Día actual':      return { from: iso, to: iso };
    case 'Últimos 7 días':  return { from: sub(6), to: iso };
    case 'Últimos 28 días': return { from: sub(27), to: iso };
    case 'Últimos 90 días': return { from: sub(89), to: iso };
    case 'Esta semana':     return { from: startOf('week'), to: iso };
    case 'Este mes':        return { from: startOf('month'), to: iso };
    case 'Este año':        return { from: startOf('year'), to: iso };
    default:                return { from: iso, to: iso };
  }
}
// ── Usuarios activos en el sistema ────────────────────────────────────────────
// Antes era una lista corta e inventada aparte (5 nombres fijos, sin relación
// con nadie real). Ahora sale de los usuarios que sí existen en Usuarios y
// Permisos y están activos, así que crece o baja según la gente real del
// sistema. Cuando exista sesión real, esto debe leer quién tiene sesión
// abierta ahora mismo desde el backend (websocket/polling), no solo "activo".
export const AVATAR_COLORS = ['#2563EB',C.success,'#E0642C','#8B5CF6','#D4A017','#DB2777','#0891B2'];
// Minutos "conectado desde" - mock estable por usuario (no ligado a
// ultimoAcceso, que es la fecha del último acceso histórico y puede ser de
// hace semanas; una sesión activa realista dura minutos u horas, no días).
// Cuando exista sesión real, esto debe venir de cuándo abrió sesión ahora.
export const SESION_DESDE_MIN = [12, 47, 185, 3, 96, 22];
export const USUARIOS_CONECTADOS = USUARIOS_INIT.filter(u=>u.activo).map((u,i)=>({
  iniciales: u.descripcion.split(' ').filter(Boolean).slice(0,2).map(w=>w[0]).join('').toUpperCase(),
  color: AVATAR_COLORS[i % AVATAR_COLORS.length],
  nombre: u.descripcion,
  sesionDesdeMin: SESION_DESDE_MIN[i % SESION_DESDE_MIN.length],
}));
// Tiempo transcurrido desde el inicio de la sesión, en formato corto legible.
export function tiempoDesde(min: number): string {
  const hrs = Math.floor(min/60);
  if (hrs > 0) return `${hrs} hora${hrs===1?'':'s'} ${min%60?`${min%60}min`:''}`.trim();
  return `${min} minuto${min===1?'':'s'}`;
}
// ── Card: Estado de operaciones bancarias ────────────────────────────────────
// Antes mostraba TODOS los estados de cada módulo (Aplicado, Contabilizado,
// Conciliado, Anulado, etc.), una lista larga que en la práctica solo importa
// para lo que sigue pendiente - el resto ya está resuelto y no aporta nada
// en un dashboard. Ahora sigue la misma estructura que "Asientos pendientes +
// Situación actual": el total de operaciones pendientes a la izquierda y su
// desglose por módulo en un donut a la derecha.
export const OPERACIONES_PENDIENTES = [
  { modulo:'Cobros / Pagos',        pendientes:4 },
  { modulo:'Gestión de tarjetas',   pendientes:4 },
  { modulo:'Depósitos',             pendientes:3 },
  { modulo:'Transferencias',        pendientes:4 },
  { modulo:'Conciliación bancaria', pendientes:2 },
  { modulo:'Cheques bancarios',     pendientes:2 },
] as const;
// ── helpers aging ─────────────────────────────────────────────────────────────
export function agingColor(d: number): string {
  if (d > 120) return '#F44336';
  if (d > 90)  return '#E07B00';
  if (d > 60)  return '#A77600';
  return '#4CAF50';
}
export function agingBg(d: number): string {
  if (d > 120) return C.errorBg;
  if (d > 90)  return '#FFF7ED';
  if (d > 60)  return '#FFF8EC';
  return '#F0FAF5';
}
export function agingLabel(d: number): string {
  if (d > 120) return '+120 días';
  if (d > 90)  return '90–120 días';
  if (d > 60)  return '60–90 días';
  return '30–60 días';
}
