'use client';
// ─────────────────────────────────────────────────────────────────────────────
// Estructura estándar de toda pantalla de Front Desk (patrón de la suite):
//
//   PageHeader  → título (16/500, alto 52) + acciones de la pantalla a la derecha
//   TabBar      → pestañas (si las hay), siempre antes de los filtros
//   FilterBar   → UNA sola barra con todos los filtros; a la derecha, los
//                 contadores o las acciones masivas cuando hay selección
//   PageBody    → contenido con scroll propio
//   Pie         → acciones de formulario (Guardar / Descartar), opcional
//
// Así todas las pantallas tienen el mismo header, el mismo tamaño de título y
// el mismo orden. Nada de tabs ni filtros dentro de las tarjetas.
// ─────────────────────────────────────────────────────────────────────────────
import { createContext, useContext, useEffect, useId, useState, type CSSProperties, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { C, FONT, PAGE_PAD, SIDEBAR, SIZE } from '@/components/suite/tokens';
import { FilterBar, Page, PageBody, PageHeader, TabBar, type TabItem } from '@/components/suite/ui';

export interface TabsPantalla<T extends string> { items: readonly (T | { id: T; label?: string; count?: number })[]; activo: T; onChange: (t: T) => void; /** Texto o acciones a la derecha de las pestañas (estado de la caja…). */ derecha?: ReactNode }
export interface SeleccionPantalla { n: number; acciones: ReactNode; onLimpiar: () => void; etiqueta?: string }

// Ranuras: un componente hijo (p. ej. el contenido de una pestaña) puede poner
// sus filtros en la barra de filtros de la pantalla y su Exportar en el header,
// sin crear una segunda barra.
interface CtxRanuras { filtros: HTMLElement | null; acciones: HTMLElement | null; tabs: HTMLElement | null; masivas: HTMLElement | null; pie?: HTMLElement | null; dueno: string | null; reclamar: (id: string | null, libre?: string) => void; usar: (d: number) => void }
const Ranuras = createContext<CtxRanuras>({ filtros: null, acciones: null, tabs: null, masivas: null, dueno: null, reclamar: () => {}, usar: () => {} });
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
/** Contenedor fijo al pie de la pantalla (paginación y totales; ver suite/Paginacion · PieFijo). */
export function usePiePantalla() { return useContext(Ranuras).pie ?? null; }
/** Renderiza acciones del hijo (p. ej. Exportar lo visible) en el header de la pantalla. */
export function AccionesEnHeader({ children }: { children: ReactNode }) {
  const r = useContext(Ranuras);
  return r.acciones ? createPortal(children, r.acciones) : null;
}
const contenidos: CSSProperties = { display: 'contents' };

export function Pantalla<T extends string>({ titulo, izquierda, acciones, tabs, filtros, filtrosDerecha, seleccion, children, pie, sinPadding, cuerpoStyle, conRanuras }: {
  /** Texto del header (16/500). Puede llevar énfasis, p. ej. el saludo del Dashboard. */
  titulo: ReactNode; izquierda?: ReactNode; acciones?: ReactNode; tabs?: TabsPantalla<T>; filtros?: ReactNode; filtrosDerecha?: ReactNode; seleccion?: SeleccionPantalla;
  children: ReactNode; pie?: ReactNode; sinPadding?: boolean; cuerpoStyle?: CSSProperties;
  /** Reserva la FilterBar y el espacio de acciones para que los hijos los llenen con FiltrosEnBarra / AccionesEnHeader. */
  conRanuras?: boolean;
}) {
  const [rf, setRf] = useState<HTMLElement | null>(null);
  const [ra, setRa] = useState<HTMLElement | null>(null);
  const [rt, setRt] = useState<HTMLElement | null>(null);
  const [dueno, setDueno] = useState<string | null>(null);
  const [nUsos, setNUsos] = useState(0);
  const [usar] = useState(() => (d: number) => setNUsos(n => n + d));
  const [reclamar] = useState(() => (id: string | null, libre?: string) => setDueno(d => (libre ? (d === libre ? null : d) : d ?? id)));
  const items: TabItem[] = (tabs?.items ?? []).map(t => (typeof t === 'string' ? { label: t } : { label: t.label ?? t.id, count: t.count }));
  const ids = (tabs?.items ?? []).map(t => (typeof t === 'string' ? t : t.id)) as T[];
  const [rm, setRm] = useState<HTMLElement | null>(null);
  const [rp, setRp] = useState<HTMLElement | null>(null);
  const derecha = filtrosDerecha;
  return (
    <Page>
      {typeof titulo === 'string'
        ? <PageHeader title={titulo} left={izquierda}>{conRanuras && <span ref={setRa} style={contenidos} />}{acciones}</PageHeader>
        : (
          // Mismo header de la suite (alto 52, título 16/500) con un título enriquecido.
          <div style={{ height: SIZE.header, minHeight: SIZE.header, background: C.n000, borderBottom: `1px solid ${C.n500}`, padding: `0 ${PAGE_PAD}px`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, fontFamily: FONT, gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
              <h1 style={{ fontSize: 16, fontWeight: 500, margin: 0, color: C.n900, whiteSpace: 'nowrap' }}>{titulo}</h1>
              {izquierda}
            </div>
            {(acciones || conRanuras) && <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexShrink: 0 }}>{conRanuras && <span ref={setRa} style={contenidos} />}{acciones}</div>}
          </div>
        )}
      {tabs && <TabBar tabs={items} active={Math.max(0, ids.indexOf(tabs.activo))} onChange={i => tabs.onChange(ids[i])} actions={tabs.derecha} />}
      {conRanuras && !tabs && <div ref={setRt} style={contenidos} />}
      {(filtros || derecha || conRanuras) && <div style={filtros || derecha || nUsos > 0 ? contenidos : { display: 'none' }}><FilterBar right={derecha}>{filtros}{conRanuras && <span ref={setRf} style={contenidos} />}</FilterBar></div>}
      {seleccion && seleccion.n > 0 && <BarraMasiva n={seleccion.n} etiqueta={seleccion.etiqueta} onLimpiar={seleccion.onLimpiar}>{seleccion.acciones}</BarraMasiva>}
      {conRanuras && <div ref={setRm} style={contenidos} />}
      <PageBody style={{ display: 'flex', flexDirection: 'column', gap: 16, ...(sinPadding ? { padding: 0 } : {}), ...cuerpoStyle }}>
        <Ranuras.Provider value={{ filtros: rf, acciones: ra, tabs: rt, masivas: rm, pie: rp, dueno, reclamar, usar }}>{children}</Ranuras.Provider>
      </PageBody>
      <div ref={setRp} style={{ flexShrink: 0 }} />
      {pie && <div className="no-print" style={{ flexShrink: 0, background: C.n000, borderTop: `1px solid ${C.n500}`, padding: `10px ${PAGE_PAD}px`, display: 'flex', justifyContent: 'flex-end', gap: 10, fontFamily: FONT }}>{pie}</div>}
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
export function BarraMasiva({ n, etiqueta, onLimpiar, children }: { n: number; etiqueta?: string; onLimpiar: () => void; children: ReactNode }) {
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

/**
 * Barra de una sección dentro de una pantalla con ranuras (Configuración):
 * si es la principal, sus filtros van a la FilterBar y sus acciones al header;
 * si no (otra lista en la misma pantalla), se muestran en línea.
 */
export function BarraSeccion({ filtros, acciones, derecha }: { filtros?: ReactNode; acciones?: ReactNode; derecha?: ReactNode }) {
  const principal = useRanuraPrincipal();
  if (principal) return <>
    <FiltrosEnBarra>{filtros}{derecha && <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>{derecha}</span>}</FiltrosEnBarra>
    {acciones && <AccionesEnHeader>{acciones}</AccionesEnHeader>}
  </>;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
      {filtros}
      <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>{derecha}{acciones}</span>
    </div>
  );
}
