'use client';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { IcSearch } from './icons';
import { C, FONT, PAGE_PAD, radius, shadow } from './tokens';

// ── Barra de acciones masivas ── Aparece sobre la tabla cuando hay filas seleccionadas: fondo
// oscuro, «N seleccionados» a la izquierda y acciones a la derecha. ── FilterDropdown ──
// Desplegable de filtro de toda la app: título Semibold 12px, «Seleccionar todos» arriba, fila
// seleccionada con fondo color principal al 5 %, botones de 28px con radio 4 y «Limpiar» abajo
// a la izquierda cuando hay algo seleccionado.
interface FilterOption { value: string; label: string; icon?: ReactNode; count?: number }
export function FilterDropdown({ label, options, selected, onApply, onClear }: {
  label: string; options: (string | FilterOption)[]; selected: Set<string>;
  onApply: (s: Set<string>) => void; onClear: () => void;
}) {
  const items: FilterOption[] = options.map(o => typeof o === 'string' ? { value: o, label: o } : o);
  const [open, setOpen] = useState(false);
  const [local, setLocal] = useState<Set<string>>(new Set(selected));
  const ref = useRef<HTMLDivElement>(null);
  const active = selected.size > 0;

  useEffect(() => {
    function onClickFuera(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    function onEsc(e: KeyboardEvent) { if (e.key === 'Escape') setOpen(false); }
    if (open) { document.addEventListener('mousedown', onClickFuera); document.addEventListener('keydown', onEsc); }
    return () => { document.removeEventListener('mousedown', onClickFuera); document.removeEventListener('keydown', onEsc); };
  }, [open]);

  function toggle(v: string) { setLocal(s => { const n = new Set(s); if (n.has(v)) n.delete(v); else n.add(v); return n; }); }
  function seleccionarTodos() { setLocal(new Set(items.map(i => i.value))); }

  return (
    <div ref={ref} style={{ position: 'relative', flexShrink: 0 }}>
      <button aria-expanded={open} onClick={() => { setLocal(new Set(selected)); setOpen(v => !v); }}
        style={{ height: 32, padding: '0 12px', border: `1px solid ${active ? C.brand : C.n500}`, borderRadius: 4,
          background: active ? C.brandBg : '#FFFFFF', cursor: 'pointer', fontSize: 12, fontFamily: FONT,
          display: 'flex', alignItems: 'center', gap: 6, color: active ? C.brand : C.n900,
          fontWeight: active ? 500 : 400, whiteSpace: 'nowrap' }}>
        {label}{active ? ` (${selected.size})` : ''}
        <svg className="w-3 h-3" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M3.5 5.25L7 8.75L10.5 5.25"/></svg>
      </button>
      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, zIndex: 300, background: '#FFFFFF',
          border: `1px solid ${C.n500}`, borderRadius: 10, minWidth: 220, boxShadow: shadow.panel, overflow: 'hidden', fontFamily: FONT }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', borderBottom: `1px solid ${C.n500}` }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: C.n900 }}>{label}</span>
            <button onClick={seleccionarTodos} style={{ fontSize: 12, fontWeight: 500, color: C.brand, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', fontFamily: FONT }}>
              Seleccionar todos
            </button>
          </div>
          <div style={{ maxHeight: 260, overflowY: 'auto' }}>
            {items.map(it => {
              const checked = local.has(it.value);
              return (
                <div key={it.value} onClick={() => toggle(it.value)}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 9, padding: '8px 12px',
                    cursor: 'pointer', background: checked ? 'rgba(167,118,0,0.05)' : '#FFFFFF', fontSize: 12, color: C.n900 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                    <span style={{ width: 16, height: 16, borderRadius: 4, border: `1px solid ${checked ? C.brand : '#ECECEC'}`,
                      background: checked ? C.brand : '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {checked && <svg width="10" height="10" viewBox="0 0 14 14" fill="none" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2.33 7L5.25 9.92L11.67 4.08"/></svg>}
                    </span>
                    {it.icon}
                    {it.label}
                  </span>
                  {it.count !== undefined && <span style={{ fontSize: 12, color: C.n700 }}>{it.count}</span>}
                </div>
              );
            })}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderTop: `1px solid ${C.n500}` }}>
            {local.size > 0 ? (
              <button onClick={() => { setLocal(new Set()); onClear(); }} style={{ fontSize: 12, fontWeight: 500, color: C.error, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', fontFamily: FONT, padding: 0 }}>
                Limpiar
              </button>
            ) : <span />}
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setOpen(false)} style={{ height: 28, padding: '5px 12px', border: `1px solid ${C.n500}`, borderRadius: 4, background: '#FFFFFF', cursor: 'pointer', fontSize: 12, fontWeight: 500, fontFamily: FONT, color: C.n900 }}>Cancelar</button>
              <button onClick={() => { onApply(local); setOpen(false); }} style={{ height: 28, padding: '5px 12px', border: 'none', borderRadius: 4, background: C.brand, color: '#FFFFFF', cursor: 'pointer', fontSize: 12, fontWeight: 500, fontFamily: FONT }}>Aplicar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export function BulkActionBar({ count, actions, onClose }: {
  count:number; actions:{ label:string; onClick:()=>void; variant?:'primary'|'danger'|'outline'; icon?:ReactNode }[]; onClose:()=>void;
}) {
  if (count === 0) return null;
  const F = FONT;
  // Botones en Medium (500), «Deseleccionar» como texto y la barra de punta a punta, sin margen
  // ni redondeo, como el encabezado y la barra de filtros.
  return (
    <div style={{ position:'sticky', top:0, zIndex:5, background:'#0F0F0F', color:'#FFFFFF',
      padding:`10px ${PAGE_PAD}px`, display:'flex', alignItems:'center', justifyContent:'space-between',
      flexShrink:0, fontFamily:F }}>
      <div style={{ display:'flex', alignItems:'center', gap:12 }}>
        <span style={{ fontSize:13, fontWeight:500 }}>{count} seleccionado{count===1?'':'s'}</span>
        <button onClick={onClose} style={{ background:'none', border:'none', color:'#FFFFFF', cursor:'pointer', opacity:.75, fontSize:12, fontWeight:500, fontFamily:F, textDecoration:'underline', padding:0 }}>Deseleccionar</button>
      </div>
      <div style={{ display:'flex', gap:8 }}>
        {actions.map(a=>(
          <button key={a.label} onClick={a.onClick} style={{
            height:32, padding:'0 16px', borderRadius:4, cursor:'pointer', fontSize:12, fontWeight:500, fontFamily:F,
            display:'flex', alignItems:'center', gap:6,
            border: a.variant==='outline' ? '1px solid rgba(255,255,255,.4)' : 'none',
            background: a.variant==='danger' ? '#E24B4A' : a.variant==='outline' ? 'transparent' : '#FFFFFF',
            color: a.variant==='outline' ? '#FFFFFF' : a.variant==='danger' ? '#FFFFFF' : '#0F0F0F',
          }}>{a.icon}{a.label}</button>
        ))}
      </div>
    </div>
  );
}
// ── SearchInput ── Buscador único de las barras de filtros. `width` es opcional; por defecto
// ocupa el espacio disponible.
export function SearchInput({ value, onChange, placeholder = 'Buscar…', width, autoFocus, disabled }: {
  value: string; onChange: (v: string) => void; placeholder?: string; width?: number | string; autoFocus?: boolean; disabled?: boolean;
}) {
  return (
    <div style={{ position: 'relative', width: width ?? 'auto', flexShrink: 0 }}>
      <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: C.n700, display: 'flex', pointerEvents: 'none' }}>
        <IcSearch className="w-4 h-4" />
      </span>
      <input autoFocus={autoFocus} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} aria-label={placeholder ?? 'Buscar'} disabled={disabled}
        style={{ height: 32, width: width ?? 200, padding: '0 12px 0 34px', border: `1px solid ${C.n500}`, borderRadius: 4,
          fontSize: 12, fontFamily: FONT, outline: 'none', boxSizing: 'border-box', background: disabled ? C.n200 : C.n000, color: C.n900 }}
        onFocus={e => { e.target.style.borderColor = C.brand; }}
        onBlur={e => { e.target.style.borderColor = C.n500; }} />
    </div>
  );
}
// ── Chip ── Pastilla con × para quitar un filtro, usable en cualquier pantalla.
export function Chip({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 4, height: 24, padding: '0 8px', borderRadius: radius.pill,
      background: C.brandBg, border: `1px solid ${C.brandBd}`, fontSize: 11, color: C.brand, fontFamily: FONT }}>
      {label}
      <button onClick={onClear} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.brand, fontSize: 13, padding: 0, lineHeight: 1 }}>×</button>
    </span>
  );
}
