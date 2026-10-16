'use client';
// Reporte estándar: tabla en pantalla con encabezados de grupo, subtotales y fila de total fija.
import { useEffect, useState, type CSSProperties } from 'react';
import { C, PAGE_PAD } from '@/components/suite/tokens';
import { type BloqueRep, type Columna, type FilaRep, type Valor } from './modelo';

// ── Estilos de tabla (pantalla) ─────────────────────────────────────────────
export const th = (der?: boolean): CSSProperties => ({ position: 'sticky', top: 0, zIndex: 2, padding: '10px 12px', textAlign: der ? 'right' : 'left', fontSize: 12, fontWeight: 400, color: C.n700, background: C.n000, whiteSpace: 'nowrap', borderBottom: `1px solid ${C.n500}` });
export const td = (der?: boolean): CSSProperties => ({ padding: '10px 12px', textAlign: der ? 'right' : 'left', fontSize: 12.5, color: C.n900, borderBottom: '1px solid #EDEDF0', whiteSpace: 'nowrap', fontVariantNumeric: der ? 'tabular-nums' : undefined });

/** Textos largos en una sola línea con puntos suspensivos (el valor completo queda en el título). */
function Texto({ v }: { v: Valor }) {
  if (typeof v !== 'string' || v.length <= 34) return <>{v}</>;
  return <span title={v} style={{ display: 'inline-block', maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', verticalAlign: 'bottom' }}>{v}</span>;
}
export function FilaVista({ f, columnas, conAccion }: { f: FilaRep; columnas: Columna[]; conAccion: boolean }) {
  const n = columnas.length + (conAccion ? 1 : 0);
  if (f.tipo === 'grupo') return <tr><td colSpan={n} style={{ ...td(), background: f.sub ? '#FAFAFA' : '#F5F5F7', fontWeight: f.sub ? 500 : 600, paddingLeft: f.sub ? 28 : 12 }}>{f.texto}</td></tr>;
  if (f.tipo === 'subtotal') return <tr>{f.c.map((v, j) => <td key={j} style={{ ...td(columnas[j]?.der), fontWeight: 600, background: '#FCFCFD' }}>{v}</td>)}{conAccion && <td style={td()} />}</tr>;
  return (
    <tr className="suite-fila" onClick={f.onClick} style={{ cursor: f.onClick ? 'pointer' : undefined }}>
      {f.c.map((v, j) => <td key={j} style={{ ...td(columnas[j]?.der), fontWeight: f.negrita ? 600 : 400, color: f.tenue ? C.n700 : typeof v === 'string' && /^-\s?[$₡\d]/.test(v) ? C.error : C.n900 }}><Texto v={v} /></td>)}
      {conAccion && <td style={{ ...td(true), padding: '6px 0 6px 12px' }} onClick={e => e.stopPropagation()}>{f.accion}</td>}
    </tr>
  );
}

export function Cabecera({ b, conAccion }: { b: BloqueRep; conAccion: boolean }) {
  return (
    <thead>
      {b.grupos && <tr>{b.grupos.map((g, i) => <th key={i} colSpan={g.span} style={{ ...th(), textAlign: 'center', color: C.n900, fontWeight: 500, borderBottom: g.label ? `1px solid ${C.n500}` : 'none' }}>{g.label}</th>)}{conAccion && <th style={th()} />}</tr>}
      <tr>{b.columnas.map((c, i) => <th key={i} style={th(c.der)}>{c.label}</th>)}{conAccion && <th style={th()} />}</tr>
    </thead>
  );
}
export function FilaTotal({ b, conAccion, fija }: { b: BloqueRep; conAccion: boolean; fija?: boolean }) {
  if (!b.total) return null;
  const s: CSSProperties = fija ? { position: 'sticky', bottom: 0, zIndex: 2 } : {};
  return (
    <tfoot>
      <tr>{b.total.map((v, j) => <td key={j} style={{ ...td(b.columnas[j]?.der), ...s, fontWeight: 600, fontSize: 13, background: C.n000, borderTop: `1px solid ${C.n500}`, borderBottom: 'none', padding: '12px' }}>{v}</td>)}
        {conAccion && <td style={{ ...td(), ...s, background: C.n000, borderTop: `1px solid ${C.n500}` }} />}</tr>
    </tfoot>
  );
}

/**
 * Tabla de un bloque con la fila Total fija abajo: el total va en una tabla
 * aparte que copia el ancho de cada columna y sigue el scroll horizontal.
 */
export function TablaConTotal({ b, filas, conAccion }: { b: BloqueRep; filas: FilaRep[]; conAccion: boolean }) {
  const [tab, setTab] = useState<HTMLTableElement | null>(null);
  const [anchos, setAnchos] = useState<number[]>([]);
  const [x, setX] = useState(0);
  useEffect(() => {
    if (!tab) return;
    const medir = () => setAnchos([...(tab.tHead?.rows[tab.tHead.rows.length - 1]?.cells ?? [])].map(c => c.getBoundingClientRect().width));
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(tab);
    return () => ro.disconnect();
  }, [tab, filas]);
  return <>
    <div onScroll={e => setX(e.currentTarget.scrollLeft)} style={{ flex: 1, minHeight: 0, overflow: 'auto', margin: `0 ${PAGE_PAD}px` }}>
      <table ref={setTab} style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
        <Cabecera b={b} conAccion={conAccion} />
        <tbody>{filas.map((f, i) => <FilaVista key={i} f={f} columnas={b.columnas} conAccion={conAccion} />)}</tbody>
      </table>
    </div>
    {b.total && (
      <div aria-label="Total" style={{ flexShrink: 0, overflow: 'hidden', margin: `0 ${PAGE_PAD}px`, borderTop: `1px solid ${C.n500}` }}>
        <table style={{ tableLayout: 'fixed', width: anchos.reduce((s, w) => s + w, 0) || '100%', borderCollapse: 'separate', borderSpacing: 0, transform: `translateX(${-x}px)` }}>
          <tbody><tr>{b.total.map((v, j) => <td key={j} style={{ ...td(b.columnas[j]?.der), fontWeight: 600, fontSize: 13, borderBottom: 'none', padding: '12px', boxSizing: 'border-box', width: anchos[j], minWidth: anchos[j], maxWidth: anchos[j], overflow: 'visible' }}>{v}</td>)}
            {conAccion && <td style={{ ...td(), borderBottom: 'none', boxSizing: 'border-box', width: anchos[b.total.length] }} />}</tr></tbody>
        </table>
      </div>
    )}
  </>;
}
