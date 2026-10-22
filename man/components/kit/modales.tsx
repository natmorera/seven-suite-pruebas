'use client';
// Kit de pantallas: modal base y confirmaciones.
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { C, FONT, radius } from '@/components/suite/tokens';
import { Button } from '@/components/suite/ui';

// ── Confirmación ────────────────────────────────────────────────────────────
// ── Modal único de la app ───────────────────────────────────────────────────
// Misma forma que el Modal de la suite (barra de título 14/500, cuerpo con
// padding 20, pie con acciones a la derecha), dibujado en un portal para que
// las confirmaciones y visores queden siempre encima de otros modales.
export function ModalBase({ open = true, titulo, onClose, children, pie, ancho = 520, rol = 'dialog', capa = 0, cuerpoStyle, cabecera }: {
  open?: boolean; titulo: ReactNode; onClose: () => void; children?: ReactNode; pie?: ReactNode; ancho?: number | string; rol?: 'dialog' | 'alertdialog'; capa?: number; cuerpoStyle?: CSSProperties; cabecera?: ReactNode;
}) {
  const cerrar = useRef(onClose);
  useEffect(() => { cerrar.current = onClose; });
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); cerrar.current(); } };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [open]);
  if (!open || typeof document === 'undefined') return null;
  return createPortal(
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.35)', zIndex: 1000 + capa, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={onClose}>
      <div role={rol} aria-modal aria-label={typeof titulo === 'string' ? titulo : 'Diálogo'} onClick={e => e.stopPropagation()}
        style={{ background: C.n000, borderRadius: radius.card, width: ancho, maxWidth: '100%', maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 16px 48px rgba(0,0,0,.2)', fontFamily: FONT }}>
        <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.n500}`, display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <span style={{ fontSize: 14, fontWeight: 500, color: C.n900, marginRight: 'auto' }}>{titulo}</span>
          {cabecera}
          <button type="button" onClick={onClose} aria-label="Cerrar" style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.n700, display: 'flex', padding: 4 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" aria-hidden><path d="M6 6l12 12M18 6 6 18" /></svg>
          </button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: 20, ...cuerpoStyle }}>{children}</div>
        {pie && <div style={{ padding: '14px 20px', borderTop: `1px solid ${C.n500}`, flexShrink: 0, display: 'flex', justifyContent: 'flex-end', gap: 8, alignItems: 'center' }}>{pie}</div>}
      </div>
    </div>,
    document.body,
  );
}

/** Confirmación única (toda acción que pide «¿Estás seguro?» usa este modal). */
function Confirmacion({ open = true, titulo, children, onClose, onConfirm, confirmar = 'Sí, confirmar', cancelar = 'Cancelar', peligro }: {
  open?: boolean; titulo: string; children?: ReactNode; onClose: () => void; onConfirm: () => void; confirmar?: string; cancelar?: string; peligro?: boolean;
}) {
  return (
    <ModalBase open={open} titulo={titulo} onClose={onClose} ancho={460} rol="alertdialog" capa={20}
      pie={<><Button variant="secondary" onClick={onClose}>{cancelar}</Button><Button variant={peligro ? 'danger' : 'primary'} onClick={onConfirm} style={peligro ? { background: C.error, color: '#fff', borderColor: C.error } : undefined}>{confirmar}</Button></>}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <span aria-hidden style={{ width: 30, height: 30, borderRadius: '50%', flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 15,
          color: peligro ? C.error : C.brand, background: peligro ? 'rgba(244,67,54,.08)' : C.brandBg }}>!</span>
        <div style={{ fontSize: 12.5, color: C.n900, lineHeight: 1.6, flex: 1, minWidth: 0 }}>{children ?? 'Esta acción se aplicará de inmediato.'}</div>
      </div>
    </ModalBase>
  );
}

export function Confirmar({ open, titulo, mensaje, onConfirm, onCancel, accion = 'Eliminar', peligro = true }: {
  open: boolean; titulo: string; mensaje: ReactNode; onConfirm: () => void; onCancel: () => void; accion?: string; peligro?: boolean;
}) {
  return <Confirmacion open={open} titulo={titulo} onClose={onCancel} onConfirm={onConfirm} confirmar={accion} peligro={peligro}>{mensaje}</Confirmacion>;
}

/** Estado reutilizable para «¿Eliminar X?» */
export function useConfirmar() {
  const [estado, setEstado] = useState<{ titulo: string; mensaje: ReactNode; accion?: string; peligro?: boolean; ok: () => void } | null>(null);
  const pedir = (titulo: string, mensaje: ReactNode, ok: () => void, opciones?: { accion?: string; peligro?: boolean }) => setEstado({ titulo, mensaje, ok, ...opciones });
  const dialogo = (
    <Confirmar open={!!estado} titulo={estado?.titulo ?? ''} mensaje={estado?.mensaje} accion={estado?.accion} peligro={estado?.peligro ?? true}
      onCancel={() => setEstado(null)} onConfirm={() => { estado?.ok(); setEstado(null); }} />
  );
  return { pedir, dialogo };
}
