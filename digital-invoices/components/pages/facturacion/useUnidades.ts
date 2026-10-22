'use client';
// Opciones de unidad de medida para los formularios. Guatemala usa su propio
// catálogo (Configuración › Unidades de medida); Costa Rica, la lista fija.
import { useEffect, useState } from 'react';
import { usePaisEmpresa } from '@/lib/paisCliente';
import { type UnidadMedida } from '@/lib/unidadesMedida';

// Unidades de Costa Rica (y valor inicial mientras carga el catálogo)
export const UNIDADES = [
  { value: 'Noche', label: 'Noche' }, { value: 'Servicio', label: 'Servicio (Sp)' }, { value: 'Unid', label: 'Unidad' },
  { value: 'Hora', label: 'Hora' }, { value: 'Día', label: 'Día' }, { value: 'Persona', label: 'Persona' },
  { value: 'Kg', label: 'Kilogramo' }, { value: 'L', label: 'Litro' }, { value: 'Caja', label: 'Caja' }, { value: 'Paquete', label: 'Paquete' },
];

export function useUnidades(actual?: string): { value: string; label: string }[] {
  const { gt } = usePaisEmpresa();
  const [lista, setLista] = useState<UnidadMedida[] | null>(null);
  useEffect(() => {
    if (!gt) return;
    let vivo = true;
    fetch('/api/unidades-medida').then(r => r.json()).then(d => { if (vivo) setLista(d); }).catch(() => {});
    return () => { vivo = false; };
  }, [gt]);
  if (!gt || !lista) return UNIDADES;
  const ops = lista.filter(u => u.activo).map(u => ({ value: u.valor, label: u.nombre }));
  // La unidad que ya tiene el artículo se sigue viendo aunque esté inactiva
  if (actual && !ops.some(o => o.value === actual)) ops.push({ value: actual, label: lista.find(u => u.valor === actual)?.nombre ?? actual });
  return ops;
}
