'use client';
// Hoja de creación a pantalla completa (mismo esquema que «Nueva reserva»): índice de secciones a la
// izquierda, todas las secciones visibles en una sola columna con scroll y un resumen fijo a la derecha
// con la acción principal. Al ocupar toda la pantalla solo puede haber una abierta a la vez.
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { C, FONT, radius, Z } from '@/components/suite/tokens';
import { Confirmacion } from '@/components/configuracion/kit';
import { Button } from '@/components/suite/ui';

export interface SeccionHoja {
  id: string; titulo: string; descripcion?: string; opcional?: boolean;
  /** Estado que se muestra en el índice: completa (✓), con error (!) o sin marcar. */
  estado?: 'completa' | 'error';
  contenido: ReactNode;
}

export function HojaCreacion({ titulo, sub, secciones, resumen, acciones, error, sucio, onClose, cancelar = 'Cancelar' }: {
  titulo: string; sub?: ReactNode; secciones: SeccionHoja[];
  /** Contenido del resumen fijo (columna derecha). */
  resumen: ReactNode;
  /** Botones al pie del resumen (la principal primero, a todo el ancho). */
  acciones: ReactNode;
  error?: string;
  /** Si hay datos sin guardar, cerrar pide confirmación. */
  sucio?: boolean;
  onClose: () => void;
  /** Texto del botón secundario que cierra (pide confirmación si hay cambios). */
  cancelar?: string;
}) {
  const cuerpo = useRef<HTMLDivElement>(null);
  const [activa, setActiva] = useState(secciones[0]?.id);
  const [salir, setSalir] = useState(false);
  const cerrar = () => (sucio ? setSalir(true) : onClose());

  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape' && !document.querySelector('[role=dialog][aria-modal]:not([data-hoja])')) cerrar(); };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  });
  // Sección activa del índice según el scroll
  useEffect(() => {
    const el = cuerpo.current; if (!el) return;
    const medir = () => {
      const top = el.getBoundingClientRect().top + 24;
      let actual = secciones[0]?.id ?? '';
      secciones.forEach(s => { const n = document.getElementById(`hoja-${s.id}`); if (n && n.getBoundingClientRect().top <= top + 40) actual = s.id; });
      if (el.scrollTop + el.clientHeight >= el.scrollHeight - 4) actual = secciones.at(-1)?.id ?? actual;
      setActiva(actual);
    };
    el.addEventListener('scroll', medir, { passive: true });
    return () => el.removeEventListener('scroll', medir);
  }, [secciones]);
  // El error aparece en el resumen; además se lleva a la vista la primera sección con error
  useEffect(() => {
    if (!error) return;
    const s = secciones.find(x => x.estado === 'error');
    if (s) document.getElementById(`hoja-${s.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [error, secciones]);

  if (typeof document === 'undefined') return null;
  return createPortal(
    <div data-hoja role="dialog" aria-modal aria-label={titulo} style={{ position: 'fixed', inset: 0, zIndex: Z.modal, background: C.n200, display: 'flex', flexDirection: 'column', fontFamily: FONT }}>
      <header style={{ height: 56, flexShrink: 0, background: C.n000, borderBottom: `1px solid ${C.n500}`, display: 'flex', alignItems: 'center', gap: 12, padding: '0 20px' }}>
        <button type="button" onClick={cerrar} aria-label="Volver" style={{ border: 'none', background: 'none', cursor: 'pointer', display: 'flex', padding: 4, color: C.n900 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden><path d="m15 18-6-6 6-6" /></svg>
        </button>
        <div style={{ minWidth: 0 }}>
          <h1 style={{ margin: 0, fontSize: 16, fontWeight: 500, color: C.n900 }}>{titulo}</h1>
          {sub && <div style={{ fontSize: 12, color: C.n700 }}>{sub}</div>}
        </div>
      </header>
      <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>
        <nav aria-label="Secciones" className="hoja-indice" style={{ width: 220, flexShrink: 0, padding: '24px 12px 24px 20px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {secciones.map((s, i) => {
            const on = s.id === activa;
            return (
              <button key={s.id} type="button" aria-current={on ? 'step' : undefined}
                onClick={() => document.getElementById(`hoja-${s.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', border: 'none', borderRadius: radius.control, cursor: 'pointer', textAlign: 'left', fontFamily: FONT, fontSize: 12.5,
                  background: on ? C.n000 : 'transparent', color: on ? C.brand : C.n900, fontWeight: on ? 600 : 400, boxShadow: on ? `inset 2px 0 0 ${C.brand}` : undefined }}>
                <span aria-hidden style={{ width: 20, height: 20, borderRadius: '50%', flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 10.5, fontWeight: 600,
                  background: s.estado === 'error' ? C.error : s.estado === 'completa' ? C.success : on ? C.brand : C.n500, color: s.estado || on ? '#fff' : C.n700 }}>
                  {s.estado === 'error' ? '!' : s.estado === 'completa' ? '✓' : i + 1}
                </span>
                <span style={{ minWidth: 0 }}>{s.titulo}{s.opcional && <span style={{ display: 'block', fontSize: 11, color: C.n700, fontWeight: 400 }}>Opcional</span>}</span>
              </button>
            );
          })}
        </nav>
        <div ref={cuerpo} style={{ flex: 1, minWidth: 0, overflowY: 'auto', padding: '24px 24px 80px' }}>
          <div style={{ maxWidth: 860, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
            {secciones.map((s, i) => (
              <section key={s.id} id={`hoja-${s.id}`} aria-labelledby={`hoja-t-${s.id}`}
                style={{ background: C.n000, border: `1px solid ${s.estado === 'error' ? 'rgba(244,67,54,.45)' : C.n500}`, borderRadius: radius.card, padding: 20, display: 'flex', flexDirection: 'column', gap: 14, scrollMarginTop: 16 }}>
                <div>
                  <h2 id={`hoja-t-${s.id}`} style={{ margin: 0, fontSize: 14, fontWeight: 600, color: C.n900, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ color: C.n700, fontWeight: 400 }}>{i + 1}.</span>{s.titulo}
                    {s.opcional && <span style={{ fontSize: 11, fontWeight: 400, color: C.n700, background: C.n200, borderRadius: radius.pill, padding: '1px 8px' }}>Opcional</span>}
                  </h2>
                  {s.descripcion && <p style={{ margin: '4px 0 0', fontSize: 12, color: C.n700, lineHeight: 1.5 }}>{s.descripcion}</p>}
                </div>
                {s.contenido}
              </section>
            ))}
          </div>
        </div>
        <aside aria-label="Resumen" style={{ width: 300, flexShrink: 0, background: C.n000, borderLeft: `1px solid ${C.n500}`, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <h2 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>Resumen</h2>
            {resumen}
          </div>
          <div style={{ padding: '12px 20px 16px', borderTop: `1px solid ${C.n500}`, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {error && <div role="alert" style={{ background: 'rgba(244,67,54,.06)', color: C.error, borderRadius: radius.md, padding: '10px 12px', fontSize: 12, lineHeight: 1.5 }}>{error}</div>}
            {acciones}
            <Button variant="secondary" onClick={cerrar} style={{ width: '100%', justifyContent: 'center' }}>{cancelar}</Button>
          </div>
        </aside>
      </div>
      <style>{'@media (max-width: 1180px) { .hoja-indice { display: none !important; } }'}</style>
      <Confirmacion open={salir} titulo="¿Salir sin guardar?" onClose={() => setSalir(false)} onConfirm={onClose} confirmar="Salir sin guardar" cancelar="Seguir editando" peligro>
        Se perderán los datos que llenaste.
      </Confirmacion>
    </div>,
    document.body,
  );
}

/** Fila «etiqueta · valor» del resumen. */
export const FilaResumen = ({ l, v, vacio }: { l: string; v: ReactNode; vacio?: boolean }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 12.5 }}>
    <span style={{ color: C.n700, flexShrink: 0 }}>{l}</span>
    <span style={{ color: vacio ? '#9A9AA3' : C.n900, textAlign: 'right', minWidth: 0, overflowWrap: 'anywhere' }}>{v}</span>
  </div>
);
