'use client';
// Kit de pantallas: utilidades base (ids, normalización de texto), botón con borde y enlace con forma de botón.
import { type ReactNode } from 'react';
import { C, FONT, radius, SIZE } from '@/components/suite/tokens';
import { Button } from '@/components/suite/ui';

// ── Utilidades ──────────────────────────────────────────────────────────────
export const uid = () => Math.random().toString(36).slice(2, 10);
export const norm = (s: unknown) => String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

/** Botón secundario: borde gris y texto negro (+ Agregar nueva, Abrir, Sincronizar ahora). */
export function OutlineButton({ children, onClick, icon, disabled }: { children: ReactNode; onClick?: () => void; icon?: ReactNode; disabled?: boolean }) {
  return (
    <Button variant="secondary" onClick={onClick} icon={icon} disabled={disabled} style={{ color: C.n900, borderColor: C.n500 }}>{children}</Button>
  );
}

/** Enlace con la forma de un botón de la suite (WhatsApp de ventas, abrir un módulo). Abre en otra pestaña. */
export function BotonEnlace({ href, children, icon, variante = 'primario' }: { href: string; children: ReactNode; icon?: ReactNode; variante?: 'primario' | 'contorno' }) {
  const primario = variante === 'primario';
  return (
    <a href={href} target="_blank" rel="noopener noreferrer"
      style={{ height: SIZE.control, padding: '0 12px', borderRadius: radius.control, fontSize: 12, fontWeight: 500, fontFamily: FONT, textDecoration: 'none',
        display: 'inline-flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap', boxSizing: 'border-box',
        background: primario ? C.brand : C.n000, color: primario ? '#fff' : C.n900, border: `1px solid ${primario ? C.brand : C.n500}` }}>
      {icon}{children}
    </a>
  );
}
