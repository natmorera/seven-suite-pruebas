'use client';
import { FONT } from '../../../ui/tokens';

export const F = FONT;
export interface Periodo { orden:number; desde:string; hasta:string; titulo:string; dias:number; estado:'Apertura'|'Bloqueado'|'Activo'|'Pendiente'|'Cierre'; }
export function makePeriodos(y:number): Periodo[] {
  const dias=[31,y%4===0?29:28,31,30,31,30,31,31,30,31,30,31];
  const meses=['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  return [
    { orden:0, desde:`1/1/${y}`, hasta:`1/1/${y}`, titulo:'Apertura', dias:0, estado:'Apertura' },
    ...meses.map((m,i):Periodo => ({ orden:i+1, desde:`1/${i+1}/${y}`, hasta:`${dias[i]}/${i+1}/${y}`, titulo:m, dias:dias[i], estado:i<4?'Bloqueado':i===4?'Activo':'Pendiente' as any })),
    { orden:13, desde:`31/12/${y}`, hasta:`31/12/${y}`, titulo:'Cierre', dias:0, estado:'Cierre' },
  ];
}
export interface Ejercicio { id:number; anio:number; empresa:string; codigo:string; nPagCheque:number; inicio:string; cierre:string; estado:'activo'|'cerrado'; periodos:Periodo[]; }
export const INIT: Ejercicio[] = [
  { id:1, anio:2026, empresa:'Hotel Fortuna', codigo:'001', nPagCheque:37, inicio:'Apertura 2025', cierre:'Cierre 2026', estado:'activo', periodos:makePeriodos(2026) },
  { id:2, anio:2025, empresa:'Hotel Fortuna', codigo:'001', nPagCheque:37, inicio:'Apertura 2024', cierre:'Cierre 2025', estado:'cerrado', periodos:makePeriodos(2025).map(p=>({...p,estado:(p.estado==='Activo'||p.estado==='Pendiente'?'Bloqueado':p.estado) as any})) },
];
export const ESTADO_STYLE: Record<string,{color:string;bg:string;border:string}> = {
  Apertura:  { color:'#1565c0', bg:'#e3f2fd', border:'rgba(33,150,243,.3)' },
  Bloqueado:   { color:'#757575', bg:'#F9F9F9', border:'#ECECEC'              },
  Activo:    { color:'#2e7d32', bg:'rgba(76,175,80,.08)', border:'rgba(76,175,80,.3)' },
  Pendiente: { color:'#7a5c00', bg:'rgba(238,179,0,.08)', border:'rgba(238,179,0,.3)' },
  Cierre:    { color:'#1565c0', bg:'#e3f2fd', border:'rgba(33,150,243,.3)' },
};
// ── Modal: Nuevo ejercicio ───────────────────────────────────────────────────
// Issue #12: en modo "Manual" ya no se generan los 12 meses del calendario de
// una vez - la persona agrega los períodos uno por uno (título, desde, hasta),
// y cada vez que agrega uno el sistema precarga la fecha "Desde" del
// siguiente período el día después de donde terminó el anterior.
export function parseDMY(s: string): Date | null {
  const m = s.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const d = new Date(+m[3], +m[2]-1, +m[1]);
  return isNaN(d.getTime()) ? null : d;
}
export function formatDMY(d: Date): string {
  return `${d.getDate()}/${d.getMonth()+1}/${d.getFullYear()}`;
}
export function diffDiasInclusive(desde: Date, hasta: Date): number {
  return Math.max(0, Math.round((hasta.getTime()-desde.getTime())/86400000)+1);
}
