'use client';
// Kit de Configuración: utilidades base (ids, normalización de texto) y botón con borde.
import { type ReactNode } from 'react';
import { C } from '@/components/suite/tokens';
import { Button } from '@/components/suite/ui';

// ── Utilidades ──────────────────────────────────────────────────────────────
export const uid = () => Math.random().toString(36).slice(2, 10);
export const norm = (s: unknown) => String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

/** Botón contorneado con el color del módulo (+ Agregar nueva, Importa Excel, Imprimir). */
export function OutlineButton({ children, onClick, icon, disabled }: { children: ReactNode; onClick?: () => void; icon?: ReactNode; disabled?: boolean }) {
  return (
    <Button variant="secondary" onClick={onClick} icon={icon} disabled={disabled} style={{ color: C.brand, borderColor: C.brandBd }}>{children}</Button>
  );
}
