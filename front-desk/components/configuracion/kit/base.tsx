'use client';
// Kit de Configuración: utilidades base (ids, normalización de texto) y botón con borde.
import { type ReactNode } from 'react';
import { Button } from '@/components/suite/ui';

// ── Utilidades ──────────────────────────────────────────────────────────────
export const uid = () => Math.random().toString(36).slice(2, 10);
export const norm = (s: unknown) => String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

/** Botón secundario (+ Agregar nueva, Importar Excel, Imprimir). */
export function OutlineButton({ children, onClick, icon, disabled }: { children: ReactNode; onClick?: () => void; icon?: ReactNode; disabled?: boolean }) {
  return (
    <Button variant="secondary" onClick={onClick} icon={icon} disabled={disabled}>{children}</Button>
  );
}
