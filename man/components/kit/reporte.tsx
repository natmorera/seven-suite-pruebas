'use client';
// Piezas del reporte estándar de la suite: filtros aplicados (chips con «Limpiar todo»), contadores, estado vacío
// con «Limpiar filtros», botón Imprimir (impresora y opciones del documento) y la vista del documento en el celular,
// donde un reporte largo se ve como el PDF en lugar de la tabla.
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { C, FONT, radius } from '@/components/suite/tokens';
import { Button, Checkbox, Select } from '@/components/suite/ui';
import { OutlineButton } from './base';
import { Popover } from './selectores';

export interface ChipFiltro { id: string; label: string; quitar: () => void }

/** Un chip por cada filtro distinto de su valor por defecto; «Limpiar todo» vuelve todo al valor por defecto. */
export function FiltrosAplicados({ chips, onLimpiar }: { chips: ChipFiltro[]; onLimpiar: () => void }) {
  if (!chips.length) return null;
  return (
    <div className="reporte-franja" aria-label="Filtros aplicados" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', padding: '8px 24px',
      background: C.n000, borderBottom: `1px solid ${C.n500}`, fontFamily: FONT, flexShrink: 0 }}>
      {chips.map(c => (
        <span key={c.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 24, padding: '0 4px 0 10px', borderRadius: radius.pill, background: C.n200,
          border: `1px solid ${C.n500}`, fontSize: 11.5, color: C.n900, whiteSpace: 'nowrap' }}>
          {c.label}
          <button type="button" onClick={c.quitar} aria-label={`Quitar ${c.label}`}
            style={{ width: 18, height: 18, border: 'none', background: 'none', cursor: 'pointer', color: C.n700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" aria-hidden><path d="M6 6l12 12M18 6 6 18" /></svg>
          </button>
        </span>
      ))}
      <button type="button" onClick={onLimpiar}
        style={{ border: 'none', background: 'none', padding: '0 4px', color: C.error, fontSize: 12, fontFamily: FONT, cursor: 'pointer', textDecoration: 'underline' }}>Limpiar todo</button>
    </div>
  );
}

/** Métricas del reporte con lo filtrado: número en negrita y etiqueta gris, separadas por una línea. */
export function Contadores({ items }: { items: [ReactNode, string][] }) {
  return (
    <div className="reporte-franja" role="status" style={{ display: 'flex', alignItems: 'center', padding: '0 24px', minHeight: 36, background: C.n000, borderBottom: `1px solid ${C.n500}`,
      fontFamily: FONT, fontSize: 12, overflowX: 'auto', flexShrink: 0 }}>
      {items.map(([v, label], i) => (
        <span key={label} style={{ display: 'inline-flex', alignItems: 'baseline', gap: 6, padding: '8px 20px', paddingLeft: i ? 20 : 0, whiteSpace: 'nowrap',
          borderLeft: i ? `1px solid ${C.n500}` : 'none' }}>
          <b style={{ fontWeight: 600, color: C.n900 }}>{v}</b><span style={{ color: C.n700 }}>{label}</span>
        </span>
      ))}
    </div>
  );
}

/** Estado vacío de un reporte con filtros: explica que no hay resultados y ofrece limpiarlos. */
export function SinResultados({ cols, onLimpiar }: { cols: number; onLimpiar?: () => void }) {
  return (
    <tr>
      <td colSpan={cols} style={{ padding: '40px 16px', textAlign: 'center', fontFamily: FONT }}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: C.n900 }}>No hay resultados con los filtros aplicados</p>
        <p style={{ margin: '6px 0 14px', fontSize: 12, color: C.n700 }}>Quita algún filtro o limpia todos para ver más registros.</p>
        {onLimpiar && <OutlineButton onClick={onLimpiar}>Limpiar filtros</OutlineButton>}
      </td>
    </tr>
  );
}

export interface OpcionesDocumento { encabezado: boolean; filtros: boolean }

const IcImpresora = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinejoin="round" aria-hidden>
    <path d="M7 9V3h10v6M7 17H5a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2" /><path d="M7 14h10v7H7z" />
  </svg>
);

/** Imprimir: elige la impresora y las opciones del documento, y abre la impresión. */
export function BotonImprimir({ titulo, paginas, impresoras, onImprimir, disabled }: {
  titulo: string; paginas: number; impresoras: string[]; onImprimir: (o: OpcionesDocumento & { impresora: string }) => void; disabled?: boolean;
}) {
  const [abierto, setAbierto] = useState(false);
  const [impresora, setImpresora] = useState('');
  const [o, setO] = useState<OpcionesDocumento>({ encabezado: true, filtros: false });
  return (
    <span style={{ position: 'relative', display: 'inline-flex' }}>
      <Button variant="secondary" disabled={disabled} onClick={() => setAbierto(v => !v)}><span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><IcImpresora />Imprimir</span></Button>
      <Popover open={abierto} onClose={() => setAbierto(false)} width={280} align="right">
        <div role="dialog" aria-label="Imprimir" style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10, fontFamily: FONT }}>
          <span style={{ fontSize: 12.5, fontWeight: 600, color: C.n900 }}>Selecciona impresora</span>
          <label><span className="sr-only">Impresora</span>
            <Select value={impresora} onChange={setImpresora} options={[{ value: '', label: 'Seleccionar impresora' }, ...impresoras.map(i => ({ value: i, label: i }))]} />
          </label>
          <span style={{ fontSize: 11.5, color: C.n700, background: C.n200, borderRadius: radius.md, padding: '6px 10px' }}>Documento: {titulo} · {paginas} {paginas === 1 ? 'página' : 'páginas'}</span>
          <span style={{ fontSize: 12.5, fontWeight: 600, color: C.n900, borderTop: `1px solid ${C.n500}`, paddingTop: 10 }}>Opciones del documento</span>
          <Checkbox checked={o.encabezado} onChange={b => setO({ ...o, encabezado: b })} label="Mostrar encabezado" />
          <Checkbox checked={o.filtros} onChange={b => setO({ ...o, filtros: b })} label="Mostrar filtros aplicados" />
          <Button disabled={!impresora} onClick={() => { setAbierto(false); onImprimir({ ...o, impresora }); }}>Imprimir</Button>
        </div>
      </Popover>
    </span>
  );
}

/** El documento del reporte a escala del ancho disponible (en el celular se ve como el PDF, sin adaptar la tabla). */
export function VistaDocumento({ children, ancho = 794 }: { children: ReactNode; ancho?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [escala, setEscala] = useState(1);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const medir = () => setEscala(Math.min(1, el.clientWidth / ancho));
    medir();
    const obs = new ResizeObserver(medir);
    obs.observe(el);
    return () => obs.disconnect();
  }, [ancho]);
  return (
    <div ref={ref} aria-label="Vista del documento" style={{ width: '100%' }}>
      <div style={{ width: ancho, zoom: escala, background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,.12)', borderRadius: 4, padding: 24, boxSizing: 'border-box' }}>{children}</div>
    </div>
  );
}
