'use client';
// ─────────────────────────────────────────────────────────────────────────────
// Filtros estándar de los reportes (guía «Reportes» de la suite):
//
//   Texto libre o identificadores   → UNA búsqueda (busca en todos los campos)
//   Catálogo cerrado, 3+ opciones   → desplegable: multiselección («Estado (2)»,
//                                     con «Todos», no se cierra al marcar) o
//                                     selección única («Moneda: USD», se cierra
//                                     al elegir, nunca queda vacío)
//   Modalidad excluyente, 1-3       → radios con etiqueta, siempre uno elegido
//   Binario que limita registros    → checkbox escrito como condición
//   Ajuste de visualización/cálculo → toggle (no quita registros)
//
// Los filtros se aplican al cambiar (sin botón «Aplicar»), vuelven a la página
// 1, quedan en la URL y generan chips cuando difieren de su valor por defecto.
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { C, FONT, radius, SIZE } from '@/components/suite/tokens';
import { SearchInput, Switch } from '@/components/suite/ui';
import { IcChevronDown } from '@/components/suite/icons';
import { FiltroFecha } from '@/components/suite/FiltroFecha';
import { Popover, norm } from '@/components/configuracion/kit';
import { HOY, fmtF } from '@/components/hotel/datos';

export interface Opcion { value: string; label: string }
export type DefFiltro =
  | { k: string; tipo: 'busqueda'; placeholder: string; ancho?: number }
  | { k: string; tipo: 'multi'; label: string; opciones: Opcion[] }
  | { k: string; tipo: 'unico'; label: string; opciones: Opcion[]; def: string }
  | { k: string; tipo: 'radio'; label?: string; opciones: Opcion[]; def: string }
  | { k: string; tipo: 'check'; label: string }
  | { k: string; tipo: 'toggle'; label: string; def?: boolean }
  | { k: string; tipo: 'fecha'; label: string; def: string }
  | { k: string; tipo: 'rango'; label: string; def?: [string, string] };
export type ValorFiltro = string | string[] | boolean | [string, string];
export type Valores = Record<string, ValorFiltro>;

const defDe = (d: DefFiltro): ValorFiltro => {
  switch (d.tipo) {
    case 'busqueda': return '';
    case 'multi': return [];
    case 'unico': case 'radio': case 'fecha': return d.def;
    case 'check': return false;
    case 'toggle': return d.def ?? false;
    case 'rango': return d.def ?? ['', ''];
  }
};
const igual = (a: ValorFiltro, b: ValorFiltro) => JSON.stringify(a) === JSON.stringify(b);
const rangoTxt = ([d, h]: [string, string]) => (d && h ? `${fmtF(d)} al ${fmtF(h)}` : d ? `desde ${fmtF(d)}` : h ? `hasta ${fmtF(h)}` : 'Todos');

/** Texto de un filtro para el chip y para la línea «Filtros» del documento. */
function texto(d: DefFiltro, v: ValorFiltro): [string, string] {
  switch (d.tipo) {
    case 'busqueda': return ['Búsqueda', `«${v as string}»`];
    case 'multi': return [d.label, (v as string[]).map(x => d.opciones.find(o => o.value === x)?.label ?? x).join(', ')];
    case 'unico': case 'radio': return [d.label ?? 'Vista', d.opciones.find(o => o.value === v)?.label ?? String(v)];
    case 'check': return [d.label, 'Sí'];
    case 'toggle': return [d.label, v ? 'Sí' : 'No'];
    case 'fecha': return [d.label, fmtF(v as string)];
    case 'rango': return [d.label, rangoTxt(v as [string, string])];
  }
}

// ── Persistencia en la URL (?f.estado=Confirmada,In-House) ──────────────────
const aURL = (d: DefFiltro, v: ValorFiltro) => (Array.isArray(v) ? v.join(',') : typeof v === 'boolean' ? (v ? '1' : '0') : v);
const deURL = (d: DefFiltro, s: string): ValorFiltro => {
  if (d.tipo === 'multi') return s ? s.split(',') : [];
  if (d.tipo === 'rango') { const [a = '', b = ''] = s.split(','); return [a, b]; }
  if (d.tipo === 'check' || d.tipo === 'toggle') return s === '1';
  return s;
};

export interface Filtros {
  v: Valores; defs: DefFiltro[];
  set: (k: string, valor: ValorFiltro) => void;
  /** Valor tipado de conveniencia. */
  s: (k: string) => string; m: (k: string) => string[]; b: (k: string) => boolean; r: (k: string) => [string, string];
  chips: { k: string; etiqueta: string; valor: string; quitar: () => void }[];
  limpiar: () => void; hayActivos: boolean;
  /** Línea «Filtros» del documento: etiqueta + valor, en el orden de la barra. */
  linea: [string, string][];
  /** Contador que cambia con cada filtro (para volver a la página 1). */
  version: number;
}

/**
 * Estado de los filtros de un reporte. `clave` separa la URL de reportes que
 * comparten pantalla (?r=…): al cambiar de reporte se reinician los filtros.
 */
export function useFiltros(defs: DefFiltro[], clave = ''): Filtros {
  const iniciales = useMemo(() => Object.fromEntries(defs.map(d => [d.k, defDe(d)])) as Valores, [defs]);
  const [v, setV] = useState<Valores>(iniciales);
  const [version, setVersion] = useState(0);
  const cargado = useRef('');
  // Al cambiar de reporte (o al montar): valores por defecto + lo que venga en la URL
  useEffect(() => {
    if (cargado.current === clave + defs.map(d => d.k).join()) return;
    cargado.current = clave + defs.map(d => d.k).join();
    const sp = new URLSearchParams(window.location.search);
    const x = { ...iniciales };
    defs.forEach(d => { const s = sp.get(`f.${d.k}`); if (s !== null) x[d.k] = deURL(d, s); });
    setV(x);
  }, [clave, defs, iniciales]);
  // Escribe en la URL los filtros distintos del valor por defecto
  useEffect(() => {
    if (cargado.current !== clave + defs.map(d => d.k).join()) return;
    const sp = new URLSearchParams(window.location.search);
    [...sp.keys()].filter(k => k.startsWith('f.')).forEach(k => sp.delete(k));
    defs.forEach(d => { if (!igual(v[d.k] ?? defDe(d), defDe(d))) sp.set(`f.${d.k}`, aURL(d, v[d.k])); });
    const q = sp.toString();
    const url = `${window.location.pathname}${q ? `?${q}` : ''}`;
    if (url !== `${window.location.pathname}${window.location.search}`) window.history.replaceState(window.history.state, '', url);
  }, [v, defs, clave]);

  const set = (k: string, valor: ValorFiltro) => { setV(x => ({ ...x, [k]: valor })); setVersion(n => n + 1); };
  const val = (k: string) => v[k] ?? iniciales[k];
  const activos = defs.filter(d => !igual(val(d.k), defDe(d)) && !(d.tipo === 'busqueda' && !(val(d.k) as string).trim()));
  const chips = activos.map(d => {
    const [etiqueta, valor] = texto(d, val(d.k));
    return { k: d.k, etiqueta, valor, quitar: () => set(d.k, defDe(d)) };
  });
  // En el documento: los filtros activos y, siempre, las selecciones únicas (moneda, vista…), que definen los datos
  const linea = defs.filter(d => activos.includes(d) || d.tipo === 'unico' || d.tipo === 'radio' || d.tipo === 'fecha').map(d => texto(d, val(d.k)));
  return {
    v, defs, set, version, chips, linea, hayActivos: activos.length > 0,
    s: k => String(val(k) ?? ''), m: k => (val(k) as string[]) ?? [], b: k => !!val(k), r: k => (val(k) as [string, string]) ?? ['', ''],
    limpiar: () => { setV({ ...iniciales }); setVersion(n => n + 1); },
  };
}

// ── Controles ───────────────────────────────────────────────────────────────
const boton = (activo: boolean, abierto: boolean): CSSProperties => ({
  height: SIZE.control, padding: '0 12px', border: `1px solid ${abierto || activo ? C.brand : C.n500}`, borderRadius: radius.control, background: C.n000,
  display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12, fontFamily: FONT, color: C.n900, cursor: 'pointer', whiteSpace: 'nowrap',
});
const Chevron = ({ arriba }: { arriba: boolean }) => <span style={{ display: 'inline-flex', transform: arriba ? 'rotate(180deg)' : undefined }}><IcChevronDown size={12} /></span>;
const Marca = ({ on }: { on: boolean }) => (
  <span aria-hidden style={{ width: 16, height: 16, borderRadius: 4, flexShrink: 0, boxSizing: 'border-box', border: `1.5px solid ${on ? C.brand : '#D6D6DB'}`, background: on ? C.brand : C.n000, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
    {on && <svg width="10" height="10" viewBox="0 0 14 14" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2.33 7L5.25 9.92L11.67 4.08" /></svg>}
  </span>
);

/** Multiselección: «Estado (2)», con «Todos» y búsqueda si hay muchas opciones. No se cierra al marcar. */
export function FiltroMulti({ label, opciones, value, onChange }: { label: string; opciones: Opcion[]; value: string[]; onChange: (v: string[]) => void }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const vis = opciones.filter(o => !q || norm(o.label).includes(norm(q)));
  const todos = value.length === 0;
  const fila = (on: boolean, onClick: () => void, children: ReactNode, key: string) => (
    <button key={key} type="button" role="menuitemcheckbox" aria-checked={on} onClick={onClick} className="suite-fila"
      style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left', padding: '8px 12px', border: 'none', background: 'none', fontSize: 12.5, fontFamily: FONT, color: C.n900, cursor: 'pointer' }}>
      <Marca on={on} />{children}</button>
  );
  return (
    <span style={{ position: 'relative', display: 'inline-flex' }}>
      <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open} aria-haspopup="menu" style={boton(!todos, open)}>
        {label}{!todos && ` (${value.length})`}<Chevron arriba={open} />
      </button>
      <Popover open={open} onClose={() => { setOpen(false); setQ(''); }} width={260}>
        <div role="menu" aria-label={label} style={{ display: 'flex', flexDirection: 'column', maxHeight: 340 }}>
          {opciones.length > 6 && <div style={{ padding: 8, borderBottom: `1px solid ${C.n500}` }}><SearchInput value={q} onChange={setQ} placeholder={`Buscar ${label.toLowerCase()}`} width="100%" /></div>}
          {!q && <div style={{ borderBottom: `1px solid ${C.n500}` }}>{fila(todos, () => onChange([]), 'Todos', '__todos')}</div>}
          <div style={{ overflowY: 'auto', padding: '4px 0' }}>
            {vis.map(o => fila(value.includes(o.value), () => onChange(value.includes(o.value) ? value.filter(x => x !== o.value) : [...value, o.value]), o.label, o.value))}
            {!vis.length && <span style={{ display: 'block', padding: 12, fontSize: 12, color: C.n700 }}>Sin coincidencias</span>}
          </div>
        </div>
      </Popover>
    </span>
  );
}

/** Selección única: «Moneda: USD». Se cierra al elegir y nunca queda vacía. */
export function FiltroUnico({ label, opciones, value, onChange, ancho = 240 }: { label: string; opciones: Opcion[]; value: string; onChange: (v: string) => void; ancho?: number }) {
  const [open, setOpen] = useState(false);
  const sel = opciones.find(o => o.value === value);
  return (
    <span style={{ position: 'relative', display: 'inline-flex' }}>
      <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open} aria-haspopup="listbox" aria-label={`${label}: ${sel?.label ?? ''}`} style={boton(false, open)}>
        <span style={{ maxWidth: 170, overflow: 'hidden', textOverflow: 'ellipsis' }} title={sel?.label}>{label}: {sel?.label ?? '—'}</span><Chevron arriba={open} />
      </button>
      <Popover open={open} onClose={() => setOpen(false)} width={ancho}>
        <div role="listbox" aria-label={label} style={{ padding: '4px 0', maxHeight: 320, overflowY: 'auto' }}>
          {opciones.map(o => {
            const on = o.value === value;
            return <button key={o.value} type="button" role="option" aria-selected={on} onClick={() => { onChange(o.value); setOpen(false); }} className="suite-fila"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, width: '100%', textAlign: 'left', padding: '9px 12px', border: 'none', background: on ? C.n200 : 'none', fontSize: 12.5, fontFamily: FONT, color: on ? C.brand : C.n900, cursor: 'pointer' }}>
              {o.label}{on && <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M2.33 7L5.25 9.92L11.67 4.08" /></svg>}
            </button>;
          })}
        </div>
      </Popover>
    </span>
  );
}

/** Checkbox de filtro (condición que limita registros): misma casilla clara que las tablas. */
export function CheckFiltro({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 12, fontFamily: FONT, color: C.n900, whiteSpace: 'nowrap', position: 'relative' }}>
      <input type="checkbox" checked={value} onChange={e => onChange(e.target.checked)} style={{ position: 'absolute', opacity: 0, width: 16, height: 16, margin: 0, cursor: 'pointer' }} />
      <Marca on={value} />{label}
    </label>
  );
}

function Fecha({ label, value, onChange, limpiable }: { label: string; value: string; onChange: (v: string) => void; limpiable?: boolean }) {
  return (
    <label style={{ ...boton(false, false), position: 'relative' }}>
      {label}: {value ? fmtF(value) : 'Todas'}
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} aria-hidden><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></svg>
      <input type="date" value={value} aria-label={label} onChange={e => onChange(e.target.value || (limpiable ? '' : HOY))}
        onClick={e => (e.currentTarget as HTMLInputElement & { showPicker?: () => void }).showPicker?.()}
        style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%' }} />
    </label>
  );
}
function Rango({ label, value, onChange }: { label: string; value: [string, string]; onChange: (v: [string, string]) => void }) {
  return <FiltroFecha label={label} desde={value[0]} hasta={value[1]} onChange={(d, h) => onChange([d, h])} />;
}

/** Controles de la barra en el orden de las definiciones. Con dos o más casillas o interruptores, estos se agrupan en
 *  «Opciones ▾» al final junto con las modalidades excluyentes (agrupar, vista), para que la barra quede en una sola línea. */
export function ControlesFiltros({ f }: { f: Filtros }) {
  const binarios = f.defs.filter(d => d.tipo === 'check' || d.tipo === 'toggle');
  const agrupar = binarios.length >= 2;
  return <>{f.defs.map(d => {
    switch (d.tipo) {
      case 'busqueda': return <SearchInput key={d.k} value={f.s(d.k)} onChange={x => f.set(d.k, x)} placeholder={d.placeholder} width={d.ancho ?? 200} />;
      case 'multi': return <FiltroMulti key={d.k} label={d.label} opciones={d.opciones} value={f.m(d.k)} onChange={x => f.set(d.k, x)} />;
      case 'unico': return <FiltroUnico key={d.k} label={d.label} opciones={d.opciones} value={f.s(d.k)} onChange={x => f.set(d.k, x)} />;
      // Las opciones excluyentes van en un desplegable para que la barra quede en una sola línea
      case 'radio': return agrupar ? null : <FiltroUnico key={d.k} label={d.label ?? 'Vista'} opciones={d.opciones} value={f.s(d.k)} onChange={x => f.set(d.k, x)} />;
      case 'check': return agrupar ? null : <CheckFiltro key={d.k} label={d.label} value={f.b(d.k)} onChange={x => f.set(d.k, x)} />;
      case 'toggle': return agrupar ? null : <span key={d.k} style={{ whiteSpace: 'nowrap' }}><Switch checked={f.b(d.k)} onChange={x => f.set(d.k, x)} label={d.label} /></span>;
      case 'fecha': return <Fecha key={d.k} label={d.label} value={f.s(d.k)} onChange={x => f.set(d.k, x)} />;
      case 'rango': return <Rango key={d.k} label={d.label} value={f.r(d.k)} onChange={x => f.set(d.k, x)} />;
    }
  })}{agrupar && <Opciones f={f} defs={[...f.defs.filter(d => d.tipo === 'radio'), ...binarios]} />}</>;
}

/** «Opciones ▾»: casillas e interruptores del reporte en un desplegable. */
function Opciones({ f, defs }: { f: Filtros; defs: DefFiltro[] }) {
  const [open, setOpen] = useState(false);
  const activas = defs.filter(d => (d.tipo === 'radio' ? f.s(d.k) !== d.def : f.b(d.k) !== (d.tipo === 'toggle' ? (d.def ?? false) : false))).length;
  return (
    <span style={{ position: 'relative', display: 'inline-flex' }}>
      <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open} style={boton(activas > 0, open)}>
        Opciones{activas ? ` (${activas})` : ''}<Chevron arriba={open} />
      </button>
      <Popover open={open} onClose={() => setOpen(false)} width={260} align="right">
        <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 12, fontFamily: FONT }}>
          {defs.map(d => d.tipo === 'radio' ? (
            <div key={d.k} role="radiogroup" aria-label={d.label ?? 'Vista'} style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingBottom: 10, borderBottom: `1px solid ${C.n500}` }}>
              <span style={{ fontSize: 11.5, color: C.n700 }}>{d.label ?? 'Vista'}</span>
              {d.opciones.map(o => {
                const on = f.s(d.k) === o.value;
                return <button key={o.value} type="button" role="radio" aria-checked={on} onClick={() => f.set(d.k, o.value)}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, border: 'none', background: 'none', padding: '2px 0', fontSize: 12.5, fontFamily: FONT, color: C.n900, cursor: 'pointer', textAlign: 'left' }}>
                  <span aria-hidden style={{ width: 14, height: 14, borderRadius: '50%', border: `1.5px solid ${on ? C.brand : '#D6D6DB'}`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{on && <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.brand }} />}</span>{o.label}
                </button>;
              })}
            </div>
          ) : d.tipo === 'toggle'
            ? <Switch key={d.k} checked={f.b(d.k)} onChange={x => f.set(d.k, x)} label={d.label} />
            : d.tipo === 'check' ? <CheckFiltro key={d.k} label={d.label} value={f.b(d.k)} onChange={x => f.set(d.k, x)} /> : null)}
        </div>
      </Popover>
    </span>
  );
}

/** Fila de chips de filtros activos + «Limpiar todo». */
export function ChipsFiltros({ f }: { f: Filtros }) {
  if (!f.chips.length) return null;
  return (
    <div className="no-print" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', padding: '8px 24px', borderBottom: `1px solid ${C.n500}`, background: C.n000, fontFamily: FONT, flexShrink: 0 }}>
      {f.chips.map(c => (
        <span key={c.k} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 26, padding: '0 6px 0 12px', borderRadius: radius.pill, background: '#EEEEF1', fontSize: 12, color: C.n900 }}>
          {c.etiqueta}: {c.valor}
          <button type="button" aria-label={`Quitar filtro ${c.etiqueta}`} onClick={c.quitar} style={{ width: 18, height: 18, border: 'none', background: 'none', cursor: 'pointer', color: C.n700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>
            <svg width="10" height="10" viewBox="0 0 10 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden><path d="M1 1l8 8M9 1L1 9" /></svg>
          </button>
        </span>
      ))}
      <button type="button" onClick={f.limpiar} style={{ marginLeft: 6, border: 'none', background: 'none', color: C.error, textDecoration: 'underline', fontSize: 12, cursor: 'pointer', fontFamily: FONT, padding: 0 }}>Limpiar todo</button>
    </div>
  );
}
