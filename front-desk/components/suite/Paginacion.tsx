'use client';
// Paginación estándar de la suite (como Digital Invoices): a la izquierda «1–50 de 595», a la derecha
// «‹ Anterior 1 … 4 5 6 … 12 Siguiente ›». Va siempre en una barra fija al pie de la pantalla (PieFijo).
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { C, FONT, PAGE_PAD, radius } from './tokens';
import { usePiePantalla } from '@/components/layout/Pantalla';

export function Paginacion({ pagina, paginas, filas, porPagina, onChange, extra }: {
  pagina: number; paginas: number; onChange: (p: number) => void;
  /** Total de filas y filas por página: muestran «1–50 de 595». */
  filas?: number; porPagina?: number;
  /** Contenido a la izquierda, junto al conteo (totales, notas). */
  extra?: ReactNode;
}) {
  const total = Math.max(1, paginas);
  const actual = Math.min(Math.max(1, pagina), total);
  const visibles = (): (number | '…')[] => {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const out: (number | '…')[] = [1];
    if (actual > 3) out.push('…');
    for (let p = Math.max(2, actual - 1); p <= Math.min(total - 1, actual + 1); p++) out.push(p);
    if (actual < total - 2) out.push('…');
    out.push(total);
    return out;
  };
  const nav = (off: boolean): CSSProperties => ({ height: 28, padding: '0 10px', border: `1px solid ${C.n500}`, borderRadius: radius.sm, background: C.n000, fontSize: 12, fontFamily: FONT, color: C.n900, cursor: off ? 'default' : 'pointer', opacity: off ? 0.4 : 1, whiteSpace: 'nowrap' });
  const num = (on: boolean): CSSProperties => ({ height: 28, minWidth: 28, padding: '0 6px', borderRadius: radius.sm, fontSize: 12, fontFamily: FONT, cursor: 'pointer', border: `1px solid ${on ? C.brand : C.n500}`, background: on ? C.brand : C.n000, color: on ? '#fff' : C.n900, fontWeight: 500 });
  const conteo = filas === undefined || !porPagina ? `Página ${actual} de ${total}`
    : filas === 0 ? 'Sin resultados' : `${(actual - 1) * porPagina + 1}–${Math.min(actual * porPagina, filas)} de ${filas}`;
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, fontSize: 12, fontFamily: FONT, color: C.n700, width: '100%' }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 16, whiteSpace: 'nowrap' }}>{conteo}{extra}</span>
      {total > 1 && (
        <nav aria-label="Paginación" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <button type="button" onClick={() => onChange(actual - 1)} disabled={actual === 1} style={nav(actual === 1)}>‹ Anterior</button>
          {visibles().map((p, i) => p === '…'
            ? <span key={`e${i}`} style={{ padding: '0 4px' }}>…</span>
            : <button key={p} type="button" onClick={() => onChange(p)} aria-current={p === actual ? 'page' : undefined} style={num(p === actual)}>{p}</button>)}
          <button type="button" onClick={() => onChange(actual + 1)} disabled={actual === total} style={nav(actual === total)}>Siguiente ›</button>
        </nav>
      )}
    </div>
  );
}

/**
 * Barra fija al pie de la pantalla (paginación, totales). Dentro de una pantalla estándar se coloca en su pie;
 * dentro de un modal o panel lateral, o fuera de una pantalla, queda al final del contenido.
 */
export function PieFijo({ children }: { children: ReactNode }) {
  const destino = usePiePantalla();
  const marca = useRef<HTMLSpanElement>(null);
  const [enDialogo, setEnDialogo] = useState(true);
  useEffect(() => { setEnDialogo(!!marca.current?.closest('[role="dialog"], [aria-modal="true"]')); }, []);
  const barra = (
    <div className="no-print" style={{ display: 'flex', alignItems: 'center', minHeight: 48, boxSizing: 'border-box', padding: `8px ${destino && !enDialogo ? PAGE_PAD : 0}px`, background: C.n000,
      borderTop: `1px solid ${C.n500}`, fontFamily: FONT }}>{children}</div>
  );
  return <>
    <span ref={marca} style={{ display: 'none' }} />
    {destino && !enDialogo ? createPortal(barra, destino) : <div style={{ marginTop: 4 }}>{barra}</div>}
  </>;
}
