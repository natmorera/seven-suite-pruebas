'use client';
// ─────────────────────────────────────────────────────────────────────────────
// Estructura estándar de toda pantalla (patrón de la suite):
//
//   Header     → título (16/500, alto 52) + acciones de la pantalla a la derecha
//   Pestañas   → si las hay, siempre antes de los filtros
//   Filtros    → UNA sola barra: buscador, filtros desplegables y, a la derecha,
//                los contadores o las acciones masivas cuando hay selección
//   Cuerpo     → contenido con scroll propio
//
// Nada de pestañas ni filtros dentro de las tarjetas.
// ─────────────────────────────────────────────────────────────────────────────
import { createContext, useContext, useEffect, useId, useState, type CSSProperties, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { C, FONT, PAGE_PAD, SIDEBAR, SIZE } from '@/components/suite/tokens';
import { FilterBar, Page, TabBar, type TabItem } from '@/components/suite/ui';

interface TabsPantalla<T extends string> { items: readonly (T | { id: T; label?: string; count?: number })[]; activo: T; onChange: (t: T) => void }

// Ranuras: un componente hijo (p. ej. el contenido de una pestaña) puede poner
// sus filtros en la barra de filtros de la pantalla y su Exportar en el header,
// sin crear una segunda barra.
interface CtxRanuras { filtros: HTMLElement | null; acciones: HTMLElement | null; titulo: HTMLElement | null; antes: HTMLElement | null; pie: HTMLElement | null; tabs: HTMLElement | null; masivas: HTMLElement | null; dueno: string | null; reclamar: (id: string | null, libre?: string) => void; usar: (d: number) => void }
const Ranuras = createContext<CtxRanuras>({ filtros: null, acciones: null, titulo: null, antes: null, pie: null, tabs: null, masivas: null, dueno: null, reclamar: () => {}, usar: () => {} });
/**
 * Para componentes que pueden aparecer varias veces en una pantalla (p. ej. un
 * catálogo): solo el primero ocupa la barra de filtros y el header; el resto
 * mantiene su barra propia. Devuelve true si este componente es el dueño.
 */
export function useRanuraPrincipal() {
  const r = useContext(Ranuras);
  const id = useId();
  const hay = !!r.filtros;
  const { reclamar, dueno } = r;
  useEffect(() => {
    if (!hay) return;
    if (!dueno) reclamar(id);
  }, [hay, dueno, id, reclamar]);
  useEffect(() => () => reclamar(null, id), [id, reclamar]);
  return hay && dueno === id;
}
/** Pestañas de la sección en la TabBar de la pantalla (antes de la barra de filtros). */
export function TabsEnBarra<T extends string>({ items, activo, onChange }: TabsPantalla<T>) {
  const r = useContext(Ranuras);
  if (!r.tabs) return null;
  const its: TabItem[] = items.map(t => (typeof t === 'string' ? { label: t } : { label: t.label ?? t.id, count: t.count }));
  const ids = items.map(t => (typeof t === 'string' ? t : t.id)) as T[];
  return createPortal(<TabBar tabs={its} active={Math.max(0, ids.indexOf(activo))} onChange={i => onChange(ids[i])} />, r.tabs);
}
/** Renderiza los filtros del hijo dentro de la única FilterBar de la pantalla. */
export function FiltrosEnBarra({ children }: { children: ReactNode }) {
  const r = useContext(Ranuras);
  const { usar } = r;
  useEffect(() => { usar(1); return () => usar(-1); }, [usar]);
  return r.filtros ? createPortal(children, r.filtros) : null;
}
/** Renderiza un control del hijo justo después del título del header (p. ej. el selector de empresa). */
export function JuntoAlTitulo({ children }: { children: ReactNode }) {
  const r = useContext(Ranuras);
  return r.titulo ? createPortal(children, r.titulo) : null;
}
/** Flecha para volver al nivel anterior, antes del título (p. ej. del detalle de una entidad a la lista). */
export function VolverEnTitulo({ onClick, label }: { onClick: () => void; label: string }) {
  const r = useContext(Ranuras);
  if (!r.antes) return null;
  return createPortal(
    <button type="button" onClick={onClick} aria-label={label} title={label} className="suite-fila"
      style={{ width: 30, height: 30, borderRadius: 8, border: 'none', background: 'none', color: C.n900, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: 0, marginLeft: -6 }}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M19 12H5M11 6l-6 6 6 6" /></svg>
    </button>, r.antes);
}
/** Pie fijo de la pantalla, debajo del cuerpo con scroll (ahí va la paginación de las tablas); null fuera de una pantalla. */
export const usePie = () => useContext(Ranuras).pie;
/** Renderiza un contenido del hijo debajo de la barra de filtros (filtros aplicados y contadores de un reporte). */
export function BajoFiltros({ children }: { children: ReactNode }) {
  const r = useContext(Ranuras);
  return r.masivas ? createPortal(children, r.masivas) : <>{children}</>;
}
/** Renderiza acciones del hijo (p. ej. Exportar lo visible) en el header de la pantalla. */
export function AccionesEnHeader({ children }: { children: ReactNode }) {
  const r = useContext(Ranuras);
  return r.acciones ? createPortal(children, r.acciones) : null;
}
const contenidos: CSSProperties = { display: 'contents' };

/**
 * Pantalla del MAN: header (título + acciones), pestañas, barra de filtros y cuerpo con scroll propio.
 * Las pantallas llenan pestañas, filtros y acciones con TabsEnBarra, FiltrosEnBarra y AccionesEnHeader.
 * En pantallas angostas el header y las barras se acomodan en varias líneas.
 */
export function Pantalla({ titulo, izquierda, acciones, children }: { titulo: string; izquierda?: ReactNode; acciones?: ReactNode; children: ReactNode }) {
  const [rf, setRf] = useState<HTMLElement | null>(null);
  const [ra, setRa] = useState<HTMLElement | null>(null);
  const [rti, setRti] = useState<HTMLElement | null>(null);
  const [rat, setRat] = useState<HTMLElement | null>(null);
  const [rp, setRp] = useState<HTMLElement | null>(null);
  const [rt, setRt] = useState<HTMLElement | null>(null);
  const [rm, setRm] = useState<HTMLElement | null>(null);
  const [dueno, setDueno] = useState<string | null>(null);
  const [nUsos, setNUsos] = useState(0);
  const [filtrosAbiertos, setFiltrosAbiertos] = useState(false);
  const [usar] = useState(() => (d: number) => setNUsos(n => n + d));
  const [reclamar] = useState(() => (id: string | null, libre?: string) => setDueno(d => (libre ? (d === libre ? null : d) : d ?? id)));
  return (
    <Page>
      <header className="pantalla-header" style={{ minHeight: SIZE.header, background: C.n000, borderBottom: `1px solid ${C.n500}`, padding: `0 ${PAGE_PAD}px`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', columnGap: 16, flexShrink: 0, fontFamily: FONT }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, minHeight: SIZE.header }}>
          <span ref={setRat} style={contenidos} />
          <h1 style={{ fontSize: 16, fontWeight: 500, margin: 0, color: C.n900 }}>{titulo}</h1>
          <span ref={setRti} style={contenidos} />
          {izquierda}
        </div>
        {/* Con cambios sin guardar solo se ven «Cancelar» y «Guardar cambios»: las demás acciones vuelven al guardar o descartar. */}
        <div className="pantalla-acciones" style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={acciones ? { display: 'none' } : contenidos}><span ref={setRa} style={contenidos} /></span>{acciones}
        </div>
      </header>
      <div ref={setRt} className="pantalla-tabs" style={contenidos} />
      {/* En el celular se ve la búsqueda y «Filtros» despliega los demás filtros en varias líneas (sin scroll horizontal). */}
      <div className={`pantalla-filtros${filtrosAbiertos ? ' abiertos' : ''}`} style={nUsos > 0 ? contenidos : { display: 'none' }}>
        <FilterBar>
          <span ref={setRf} style={contenidos} />
          <button type="button" className="boton-filtros" aria-expanded={filtrosAbiertos} onClick={() => setFiltrosAbiertos(v => !v)}
            style={{ display: 'none', height: SIZE.control, padding: '0 12px', alignItems: 'center', gap: 6, borderRadius: 6, border: `1px solid ${C.n500}`, background: C.n000,
              color: C.n900, fontSize: 12, fontFamily: FONT, cursor: 'pointer', marginLeft: 'auto', flexShrink: 0 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" aria-hidden><path d="M4 6h16M7 12h10M10 18h4" /></svg>
            {filtrosAbiertos ? 'Ocultar filtros' : 'Filtros'}
          </button>
        </FilterBar>
      </div>
      <div ref={setRm} style={contenidos} />
      <div className="pantalla-cuerpo" style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: PAGE_PAD, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Ranuras.Provider value={{ filtros: rf, acciones: ra, titulo: rti, antes: rat, pie: rp, tabs: rt, masivas: rm, dueno, reclamar, usar }}>{children}</Ranuras.Provider>
      </div>
      <div ref={setRp} className="pantalla-pie" style={contenidos} />
    </Page>
  );
}

// ── Selección para acciones masivas ─────────────────────────────────────────
export function useSeleccion() {
  const [sel, setSel] = useState<string[]>([]);
  return {
    sel, n: sel.length, limpiar: () => setSel([]), set: setSel,
    tiene: (id: string) => sel.includes(id),
    alternar: (id: string) => setSel(s => (s.includes(id) ? s.filter(x => x !== id) : [...s, id])),
    /** Marca o desmarca todos los visibles. */
    todos: (ids: string[], on: boolean) => setSel(s => (on ? [...new Set([...s, ...ids])] : s.filter(x => !ids.includes(x)))),
  };
}
export type Seleccion = ReturnType<typeof useSeleccion>;

/** Casilla de selección de tablas: borde gris claro (como el resto de la suite), marca de la marca al elegir. */
function Casilla({ on, parcial, label, onChange, inputRef }: { on: boolean; parcial?: boolean; label: string; onChange: (v: boolean) => void; inputRef?: (el: HTMLInputElement | null) => void }) {
  const lleno = on || parcial;
  return (
    <span onClick={e => e.stopPropagation()} style={{ position: 'relative', display: 'inline-flex', width: 16, height: 16, flexShrink: 0, verticalAlign: 'middle' }}>
      <input type="checkbox" aria-label={label} checked={on} ref={inputRef} onChange={e => onChange(e.target.checked)}
        style={{ position: 'absolute', inset: 0, width: 16, height: 16, margin: 0, opacity: 0, cursor: 'pointer' }} />
      <span aria-hidden style={{ width: 16, height: 16, borderRadius: 4, boxSizing: 'border-box', border: `1.5px solid ${lleno ? C.brand : '#D6D6DB'}`, background: lleno ? C.brand : C.n000,
        display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background .12s, border-color .12s', pointerEvents: 'none' }}>
        {on && <svg width="10" height="10" viewBox="0 0 14 14" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2.33 7L5.25 9.92L11.67 4.08" /></svg>}
        {!on && parcial && <span style={{ width: 8, height: 2, borderRadius: 1, background: '#fff' }} />}
      </span>
    </span>
  );
}
/** Casilla del encabezado: selecciona todas las filas visibles. */
export function CheckTodos({ s, ids, label = 'Seleccionar todos' }: { s: Seleccion; ids: string[]; label?: string }) {
  const n = ids.filter(s.tiene).length;
  const parcial = n > 0 && n < ids.length;
  return <Casilla on={ids.length > 0 && n === ids.length} parcial={parcial} label={label} onChange={v => s.todos(ids, v)} inputRef={el => { if (el) el.indeterminate = parcial; }} />;
}
/** Casilla de la fila. */
export function CheckFila({ s, id, label }: { s: Seleccion; id: string; label?: string }) {
  return <Casilla on={s.tiene(id)} label={label ?? `Seleccionar ${id}`} onChange={() => s.alternar(id)} />;
}

/**
 * Barra de acciones masivas (patrón de la suite): franja oscura del color del
 * menú, justo debajo de la barra de filtros. «N seleccionados · Deseleccionar»
 * a la izquierda y las acciones a la derecha.
 */
function BarraMasiva({ n, etiqueta, onLimpiar, children }: { n: number; etiqueta?: string; onLimpiar: () => void; children: ReactNode }) {
  return (
    <div role="toolbar" aria-label="Acciones masivas" className="no-print"
      style={{ position: 'sticky', top: 0, zIndex: 5, flexShrink: 0, background: SIDEBAR.bg, color: '#fff', padding: `10px ${PAGE_PAD}px`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', fontFamily: FONT }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 13, fontWeight: 500 }}>{n} {etiqueta ?? (n === 1 ? 'seleccionado' : 'seleccionados')}</span>
        <button type="button" onClick={onLimpiar} style={{ background: 'none', border: 'none', color: '#fff', opacity: 0.75, cursor: 'pointer', fontSize: 12, fontWeight: 500, fontFamily: FONT, textDecoration: 'underline', padding: 0 }}>Deseleccionar</button>
      </span>
      <span className="barra-masiva" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>{children}</span>
    </div>
  );
}
/** Acciones masivas de una lista dentro de una pantalla con ranuras: se muestran en la barra oscura de la pantalla. */
export function AccionesMasivas({ s, children, etiqueta }: { s: Seleccion; children: ReactNode; etiqueta?: string }) {
  const r = useContext(Ranuras);
  if (!s.n) return null;
  const barra = <BarraMasiva n={s.n} etiqueta={etiqueta} onLimpiar={s.limpiar}>{children}</BarraMasiva>;
  return r.masivas ? createPortal(barra, r.masivas) : <div style={{ flexBasis: '100%', margin: '0 -20px' }}>{barra}</div>;
}
