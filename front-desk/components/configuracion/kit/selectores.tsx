'use client';
// Kit de Configuración: popover, selección múltiple con búsqueda y lista maestra.
import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { C, FONT, radius, shadow, SIZE, Z } from '@/components/suite/tokens';
import { Button, Checkbox, Input } from '@/components/suite/ui';
import { IcChevronDown, IcSearch, IcPlus } from '@/components/suite/icons';
import { OutlineButton, norm } from './base';

// ── Popover anclado (detalle de fila, selector de color, multiselección) ────
// Se dibuja en un portal con position: fixed, así no lo recortan las tablas
// con scroll ni los modales. Se ancla al elemento padre del popover.
export function Popover({ open, onClose, children, width = 300, align = 'left', style }: {
  open: boolean; onClose: () => void; children: ReactNode; width?: number | string; align?: 'left' | 'right'; style?: CSSProperties;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const ancla = useRef<HTMLSpanElement>(null);
  const cerrar = useRef(onClose);
  const [pos, setPos] = useState<{ top: number; left: number; w: number; arriba: boolean } | null>(null);
  useEffect(() => { cerrar.current = onClose; });
  useEffect(() => {
    if (!open) return;
    const medir = () => {
      const el = ancla.current?.parentElement;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const w = typeof width === 'number' ? width : r.width;
      const alto = ref.current?.offsetHeight ?? 0;
      const arriba = alto > 0 && r.bottom + 4 + alto > window.innerHeight - 8 && r.top - 4 - alto > 8;
      let left = align === 'left' ? r.left : r.right - w;
      left = Math.max(8, Math.min(left, window.innerWidth - w - 8));
      setPos({ top: arriba ? r.top - 4 - alto : r.bottom + 4, left, w, arriba });
    };
    medir();
    const raf = requestAnimationFrame(medir);
    const fuera = (e: MouseEvent) => {
      const t = e.target as Node;
      if (ref.current?.contains(t) || ancla.current?.parentElement?.contains(t)) return;
      cerrar.current();
    };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); cerrar.current(); } };
    document.addEventListener('mousedown', fuera);
    document.addEventListener('keydown', esc, true);
    window.addEventListener('scroll', medir, true);
    window.addEventListener('resize', medir);
    return () => {
      cancelAnimationFrame(raf);
      setPos(null);
      document.removeEventListener('mousedown', fuera); document.removeEventListener('keydown', esc, true);
      window.removeEventListener('scroll', medir, true); window.removeEventListener('resize', medir);
    };
  }, [open, width, align]);
  return (
    <>
      <span ref={ancla} hidden />
      {open && typeof document !== 'undefined' && createPortal(
        <div ref={ref} role="dialog" onClick={e => e.stopPropagation()}
          style={{ position: 'fixed', top: pos?.top ?? -9999, left: pos?.left ?? -9999, width: pos?.w ?? width, zIndex: Z.modal + 10, background: C.n000,
            border: `1px solid ${C.n500}`, borderRadius: radius.md, boxShadow: shadow.panel, fontFamily: FONT, visibility: pos ? 'visible' : 'hidden', ...style }}>
          {children}
        </div>,
        document.body,
      )}
    </>
  );
}

// ── Multiselección con búsqueda (Características, Habitaciones…) ────────────
export interface Opcion { value: string; label: string; detalle?: string }
export function MultiSelect({ value, onChange, opciones, placeholder = 'Seleccione', buscar = 'Buscar por palabra clave', onCrear, crearLabel = 'Nueva opción', resumen, disabled }: {
  value: string[]; onChange: (v: string[]) => void; opciones: Opcion[]; placeholder?: string; buscar?: string;
  /** Si existe, muestra «Agregar nueva» al pie y devuelve el valor creado. */
  onCrear?: (texto: string) => string | void; crearLabel?: string;
  resumen?: (seleccion: Opcion[]) => string; disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [borrador, setBorrador] = useState<string[]>(value);
  const [nuevo, setNuevo] = useState('');
  const filtradas = useMemo(() => opciones.filter(o => norm(o.label + ' ' + o.value + ' ' + (o.detalle ?? '')).includes(norm(q))), [opciones, q]);
  const sel = opciones.filter(o => value.includes(o.value));
  const texto = sel.length === 0 ? placeholder : resumen ? resumen(sel) : sel.map(o => o.label).join(', ');
  const abrir = () => { if (disabled) return; setBorrador(value); setQ(''); setOpen(true); };
  const toggle = (v: string) => setBorrador(b => (b.includes(v) ? b.filter(x => x !== v) : [...b, v]));
  const crear = () => {
    const t = nuevo.trim();
    if (!t || !onCrear) return;
    const v = onCrear(t) ?? t;
    setBorrador(b => [...b, v]);
    setNuevo('');
  };
  return (
    <div style={{ position: 'relative' }}>
      <button type="button" onClick={abrir} aria-haspopup="listbox" aria-expanded={open} disabled={disabled} className="suite-campo"
        style={{ width: '100%', height: SIZE.control, border: `1px solid ${C.n500}`, borderRadius: radius.control, background: disabled ? C.n200 : C.n000, padding: '0 10px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, fontSize: 12, fontFamily: FONT, color: sel.length ? C.n900 : C.n700, cursor: disabled ? 'default' : 'pointer' }}>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{texto}</span>
        <IcChevronDown size={14} />
      </button>
      <Popover open={open} onClose={() => setOpen(false)} width="100%" style={{ minWidth: 260 }}>
        <div style={{ padding: 10, borderBottom: `1px solid ${C.n500}`, position: 'relative' }}>
          <span style={{ position: 'absolute', left: 20, top: '50%', transform: 'translateY(-50%)', color: C.n700, display: 'flex' }}><IcSearch size={14} /></span>
          <input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder={buscar} aria-label={buscar} className="suite-campo"
            style={{ width: '100%', height: 30, border: `1px solid ${C.n500}`, borderRadius: radius.control, padding: '0 10px 0 30px', fontSize: 12, fontFamily: FONT, outline: 'none', boxSizing: 'border-box' }} />
        </div>
        <div role="listbox" aria-multiselectable style={{ maxHeight: 220, overflowY: 'auto', padding: '6px 10px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {filtradas.length === 0 && <p style={{ fontSize: 12, color: C.n700, margin: '10px 0', textAlign: 'center' }}>Sin resultados</p>}
          {filtradas.map(o => (
            <div key={o.value} style={{ padding: '5px 0' }}>
              <Checkbox checked={borrador.includes(o.value)} onChange={() => toggle(o.value)}
                label={<span style={{ display: 'flex', gap: 10 }}>{o.detalle && <span style={{ color: C.n700, minWidth: 34 }}>{o.detalle}</span>}<span>{o.label}</span></span>} />
            </div>
          ))}
        </div>
        {onCrear && (
          <div style={{ display: 'flex', gap: 8, padding: 10, borderTop: `1px solid ${C.n500}` }}>
            <Input value={nuevo} onChange={setNuevo} placeholder={crearLabel} aria-label={crearLabel}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); crear(); } }} />
            <OutlineButton onClick={crear} icon={<IcPlus size={12} />} disabled={!nuevo.trim()}>Agregar nueva</OutlineButton>
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: 10, borderTop: `1px solid ${C.n500}` }}>
          <span style={{ fontSize: 12, color: C.n700 }}>{borrador.length} {borrador.length === 1 ? 'seleccionada' : 'seleccionadas'}</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={() => { onChange(borrador); setOpen(false); }}>Confirmar</Button>
          </div>
        </div>
      </Popover>
    </div>
  );
}

/** Desplegable Sí / No con color (Activa en reportes de auditoría). */
export function SiNoSelect({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <span style={{ position: 'relative', display: 'inline-flex' }}>
      <select value={value ? 'si' : 'no'} onChange={e => onChange(e.target.value === 'si')} aria-label={label ?? 'Activa'}
        style={{ appearance: 'none', height: 22, padding: '0 22px 0 9px', borderRadius: radius.pill, fontSize: 11, fontWeight: 500, fontFamily: FONT, cursor: 'pointer',
          border: `1px solid ${value ? 'rgba(76,175,80,.25)' : 'rgba(244,67,54,.25)'}`, background: value ? 'rgba(76,175,80,.08)' : 'rgba(244,67,54,.08)',
          color: value ? '#2E7D32' : '#C62828', outline: 'none' }}>
        <option value="si">Sí</option>
        <option value="no">No</option>
      </select>
      <span style={{ position: 'absolute', right: 7, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: value ? '#2E7D32' : '#C62828', display: 'flex' }}>
        <IcChevronDown size={10} />
      </span>
    </span>
  );
}

export function ItemMaestro({ titulo, detalle, activo, onClick, extra, indent }: {
  titulo: ReactNode; detalle?: ReactNode; activo?: boolean; onClick: () => void; extra?: ReactNode; indent?: boolean;
}) {
  return (
    <button type="button" onClick={onClick} aria-current={activo ? 'true' : undefined}
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, textAlign: 'left', width: '100%', padding: indent ? '7px 10px 7px 12px' : '9px 8px',
        background: activo ? (indent ? 'transparent' : C.n200) : 'transparent', border: 'none', borderBottom: indent ? 'none' : `1px solid ${C.n500}`, borderRadius: indent ? 0 : radius.control,
        cursor: 'pointer', fontFamily: FONT }}>
      <span style={{ minWidth: 0 }}>
        <span style={{ display: 'block', fontSize: 12, color: indent && activo ? C.brand : C.n900, fontWeight: indent && activo ? 600 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{titulo}</span>
        {detalle && <span style={{ display: 'block', fontSize: 10.5, color: C.n700, marginTop: 2 }}>{detalle}</span>}
      </span>
      {extra}
    </button>
  );
}
