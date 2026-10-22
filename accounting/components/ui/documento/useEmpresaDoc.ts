'use client';
// Datos de la empresa para los documentos (encabezado y comprobantes)
import { useAlmacen } from '@/components/pages/empresa/datos/almacen';
import { empresaAlmacen } from '@/components/pages/empresa/datos/empresa';

export interface EmpresaDoc { nombre: string; identificacion: string; direccion: string }
export function useEmpresaDoc(): EmpresaDoc {
  const e = useAlmacen(empresaAlmacen);
  return { nombre: e.nombreLegal || e.nombreComercial, identificacion: e.numeroId, direccion: e.direccion };
}
