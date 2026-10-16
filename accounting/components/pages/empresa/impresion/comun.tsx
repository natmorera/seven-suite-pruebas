'use client';
// Contenedor con scroll y margen de las pestañas de impresión
import { type ReactNode } from 'react';
import { PAGE_PAD } from '@/components/ui/tokens';

export function Pagina({ children }: { children: ReactNode }) {
  return <div style={{ flex: 1, overflowY: 'auto', padding: PAGE_PAD }}>{children}</div>;
}
