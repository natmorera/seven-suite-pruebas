'use client';
import { USUARIO_ACTUAL } from '@/components/ui/tokens';
import { crearAlmacen } from './almacen';

export type OrigenFecha = 'Manual' | 'Cierre de día';
export interface CambioFecha { anterior: string; nueva: string; origen: OrigenFecha; usuario: string; momento: string; motivo: string }
export interface FechaOperacion { fecha: string; origen: OrigenFecha; historial: CambioFecha[] }   // fechas en YYYY-MM-DD

const p2 = (n: number) => String(n).padStart(2, '0');
// YYYY-MM-DD → DD/MM/AAAA
export const fechaCorta = (iso: string) => { const [a, m, d] = iso.split('-'); return `${d}/${m}/${a}`; };
// Momento del cambio, DD/MM/AAAA HH:MM:SS
export const momentoActual = (f = new Date()) =>
  `${p2(f.getDate())}/${p2(f.getMonth() + 1)}/${f.getFullYear()} ${p2(f.getHours())}:${p2(f.getMinutes())}:${p2(f.getSeconds())}`;

export const fechaOperacionAlmacen = crearAlmacen<FechaOperacion>({
  fecha: '2026-06-02',
  origen: 'Manual',
  historial: [
    { anterior: '2026-06-01', nueva: '2026-06-02', origen: 'Manual', usuario: 'jperez', momento: '02/06/2026 06:05:12', motivo: 'Cierre de día atrasado' },
    { anterior: '2026-05-31', nueva: '2026-06-01', origen: 'Cierre de día', usuario: 'Front Desk', momento: '01/06/2026 00:02:41', motivo: '' },
    { anterior: '2026-05-30', nueva: '2026-05-31', origen: 'Cierre de día', usuario: 'Front Desk', momento: '31/05/2026 00:01:58', motivo: '' },
  ],
});

export function cambiarFechaOperacion(nueva: string, motivo: string) {
  fechaOperacionAlmacen.guardar(f => ({
    fecha: nueva, origen: 'Manual',
    historial: [{ anterior: f.fecha, nueva, origen: 'Manual', usuario: USUARIO_ACTUAL, momento: momentoActual(), motivo: motivo.trim() }, ...f.historial],
  }));
}
