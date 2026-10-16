'use client';
// Impresoras registradas en el servidor de impresión, catálogo de tipos de
// documento y la impresora asignada a cada tipo.
import { crearAlmacen } from './almacen';

export interface Impresora { id: string; nombre: string; habilitada: boolean }
export interface TipoDocumento { codigo: string; nombre: string }
export interface DatosImpresion { impresoras: Impresora[]; tipos: TipoDocumento[]; asignaciones: Record<string, string> }

export const impresionAlmacen = crearAlmacen<DatosImpresion>({
  impresoras: [
    { id: 'imp-1', nombre: 'Contabilidad', habilitada: true },
    { id: 'imp-2', nombre: 'Imp POS 80-C', habilitada: true },
    { id: 'imp-3', nombre: 'Recepción P90-C30 2020 (POS CANON 91)', habilitada: true },
  ],
  tipos: [
    { codigo: 'Asiento', nombre: 'Asiento' },
    { codigo: 'CHECK', nombre: 'Cheque' },
    { codigo: 'JOURNAL_VOUCHER', nombre: 'Comprobante de asiento' },
  ],
  asignaciones: { Asiento: 'imp-1', JOURNAL_VOUCHER: 'imp-3' },
});

// Error de validación, o null si los datos se pueden guardar
export function validarImpresion(d: DatosImpresion): string | null {
  const nombres = d.impresoras.map(i => i.nombre.trim().toLowerCase());
  if (new Set(nombres).size !== nombres.length) return 'Ya hay una impresora con ese nombre.';
  const codigos = d.tipos.map(t => t.codigo.trim());
  if (new Set(codigos).size !== codigos.length) return 'Ya existe un tipo de documento con ese código.';
  return null;
}
