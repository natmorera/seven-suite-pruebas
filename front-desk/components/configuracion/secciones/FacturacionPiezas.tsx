'use client';
// Configuración › Facturación: maestro-detalle y cabecera compartidos por Producción y Servicios.
import { type ReactNode } from 'react';
import { C } from '@/components/suite/tokens';
import { Button } from '@/components/suite/ui';
import { IcTrash } from '../kit';

/** Lista izquierda + detalle derecho, separados por una línea vertical. */
export function MaestroDetalle({ lista, children }: { lista: ReactNode; children: ReactNode }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '230px minmax(0,1fr)', gap: 18, alignItems: 'start' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, borderRight: `1px solid ${C.n500}`, paddingRight: 16, minHeight: 320 }}>{lista}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>{children}</div>
    </div>
  );
}
export function CabeceraDetalle({ titulo, sub, onEliminar }: { titulo: string; sub?: string; onEliminar?: () => void }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
      <div>
        <p style={{ fontSize: 14, fontWeight: 600, margin: 0, color: C.n900 }}>{titulo}</p>
        {sub && <p style={{ fontSize: 12, color: C.n700, margin: '3px 0 0' }}>{sub}</p>}
      </div>
      {onEliminar && <Button variant="danger" icon={<IcTrash />} onClick={onEliminar}>Eliminar</Button>}
    </div>
  );
}
export const ops = (xs: string[]) => xs.map(x => ({ value: x, label: x }));
