'use client';
// Tarjeta de cada paso de la integración de un módulo.
import { type ReactNode } from 'react';
import { ConfigCard, Insignia } from '@/components/kit';

/** Tarjeta de un paso: número, título y si ya está hecho. */
export function TarjetaPaso({ n, titulo, hecho, pendiente, listo = 'Listo', acciones, children }: {
  n: number; titulo: string; hecho: boolean; pendiente: string; listo?: string; acciones?: ReactNode; children: ReactNode;
}) {
  return (
    <ConfigCard title={`${n}. ${titulo}`} actions={<span style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
      {acciones}<Insignia label={hecho ? listo : pendiente} color={hecho ? (listo === 'Listo' ? 'green' : 'gray') : 'yellow'} /></span>}>
      {children}
    </ConfigCard>
  );
}
