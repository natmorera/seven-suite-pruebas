'use client';
import { fmtNum } from '../../../ui/formato';
import { FONT } from '../../../ui/tokens';
import { ConciliacionAfectada } from '../DescontabilizarModal';

export function fmt2(n: number) { return fmtNum(n, 2); }
export const F = FONT;
export const BRAND = '#A77600';
export type TipoAsiento = 'A' | 'M' | 'I' | 'D' | 'P';
export type Moneda = 'CRC' | 'USD';
export interface LineaAsiento { id: number; cuenta: string; descripcion: string; cCostos: string; debe: number; haber: number; }
export interface Asiento {
  id: number; tipo: TipoAsiento; origen: string; fecha: string; consecutivo: string;
  titulo: string; moneda: Moneda; importe: number; usuario: string; documento: string;
  observacion: string; contabilizado: boolean; lineas: LineaAsiento[];
  archivos?: string[]; historial?: { color: string; texto: string; fecha: string; usuario: string }[];
  motivoAnulacion?: string;
  conciliacion?: ConciliacionAfectada | null;
}
export const TIPOS_LABEL: Record<TipoAsiento, string> = { A:'Automático', M:'Manual', I:'Importado', D:'Duplicado', P:'Plantilla' };
export const TIPO_BG:    Record<TipoAsiento, string>  = { A:'#3B82F6', M:'#A77600', I:'#7C3AED', D:'#6B7280', P:'#059669' };
export const MON_SYM:    Record<Moneda, string>        = { CRC:'₡', USD:'$' };
// ── Toast ──────────────────────────────────────────────────────────────────────
export type ToastType = 'success'|'error'|'info'|'warning';
