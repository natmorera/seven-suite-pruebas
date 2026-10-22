'use client';
// Panel lateral estándar (media pantalla a la derecha). Se usa para las operaciones sobre un registro
// (cargos, traslados, correcciones, liquidaciones, detalle de una línea) para que la pantalla de origen
// siga visible a la izquierda. Cabecera con título y subtítulo, contenido con scroll y barra de acciones
// fija al pie: a la izquierda las acciones secundarias o de riesgo, a la derecha Cancelar y la principal.
import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { C, FONT, shadow, Z } from './tokens';

export function PanelLateral({ open = true, title, sub, onClose, children, footer, footerIzq, width = 'clamp(480px, 50vw, 760px)', nivel = 0 }: {
  open?: boolean; title: ReactNode; sub?: ReactNode; onClose: () => void; children: ReactNode;
  /** Acciones a la derecha de la barra del pie (Cancelar + principal). */
  footer?: ReactNode;
  /** Acciones a la izquierda de la barra del pie (eliminar, opciones secundarias). */
  footerIzq?: ReactNode;
  width?: number | string;
  /** Paneles abiertos desde otro panel quedan por encima. */
  nivel?: number;
}) {
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      // Solo cierra el panel de más arriba.
      const paneles = document.querySelectorAll('[data-panel-lateral]');
      const ultimo = paneles[paneles.length - 1] as HTMLElement | undefined;
      if (!ultimo || Number(ultimo.dataset.nivel) === nivel) onClose();
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [open, onClose, nivel]);
  if (!open || typeof document === 'undefined') return null;
  return createPortal(
    <div data-panel-lateral data-nivel={nivel} style={{ position: 'fixed', inset: 0, zIndex: Z.modal + nivel, fontFamily: FONT }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: nivel ? 'rgba(15,15,15,.12)' : 'rgba(15,15,15,.2)' }} />
      <aside role="dialog" aria-modal aria-label={typeof title === 'string' ? title : undefined}
        style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width, maxWidth: '100vw', background: C.n000, boxShadow: shadow.modal, display: 'flex', flexDirection: 'column' }}>
        <header style={{ padding: '16px 22px', borderBottom: `1px solid ${C.n500}`, display: 'flex', alignItems: 'flex-start', gap: 12, flexShrink: 0 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: C.n900 }}>{title}</h2>
            {sub && <div style={{ fontSize: 12.5, color: C.n700, marginTop: 3 }}>{sub}</div>}
          </div>
          <button type="button" aria-label="Cerrar" onClick={onClose} style={{ border: 'none', background: 'none', fontSize: 18, color: C.n700, cursor: 'pointer', lineHeight: 1 }}>✕</button>
        </header>
        <div style={{ flex: 1, overflowY: 'auto', padding: 22 }}>{children}</div>
        {(footer || footerIzq) && (
          <footer style={{ padding: '12px 22px', borderTop: `1px solid ${C.n500}`, background: C.n000, display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, flexWrap: 'wrap' }}>
            {footerIzq}
            <span style={{ marginLeft: 'auto', display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>{footer}</span>
          </footer>
        )}
      </aside>
    </div>,
    document.body,
  );
}
