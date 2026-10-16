'use client';
// Modelo del reporte estándar: columnas, filas (dato, grupo, subtotal), bloques y ayudas para armarlos.
import { type ReactNode } from 'react';

export type Valor = string | number;
export interface Columna { label: string; der?: boolean }
export type FilaRep =
  | { tipo?: 'dato'; c: Valor[]; id?: string; accion?: ReactNode; negrita?: boolean; tenue?: boolean; onClick?: () => void }
  | { tipo: 'grupo'; texto: string; sub?: boolean }
  | { tipo: 'subtotal'; c: Valor[] };
export interface BloqueRep { titulo?: string; columnas: Columna[]; grupos?: { label: string; span: number }[]; filas: FilaRep[]; total?: Valor[] }
export interface DatosReporte { bloques: BloqueRep[]; nota?: string }
export const esDato = (f: FilaRep): f is Extract<FilaRep, { c: Valor[]; tipo?: 'dato' }> => !f.tipo || f.tipo === 'dato';
export const registrosDe = (d: DatosReporte) => d.bloques.reduce((s, b) => s + b.filas.filter(esDato).length, 0);
/** Atajo para reportes de una sola tabla. */
export const tabla = (columnas: (string | Columna)[], filas: FilaRep[], total?: Valor[], extra?: Partial<BloqueRep>): DatosReporte =>
  ({ bloques: [{ columnas: columnas.map(c => (typeof c === 'string' ? { label: c } : c)), filas, total, ...extra }] });
/** Columnas a partir de etiquetas e índices alineados a la derecha. */
export const cols = (labels: string[], derecha: number[] = []): Columna[] => labels.map((label, i) => ({ label, der: derecha.includes(i) }));
