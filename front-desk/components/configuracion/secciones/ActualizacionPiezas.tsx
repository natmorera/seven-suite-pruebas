'use client';
// Actualización masiva del Tarifario: operaciones de precio y piezas de la interfaz (casillas, listas, tarjetas y campos).
import { useState, type ReactNode } from 'react';
import { C, FONT, radius } from '@/components/suite/tokens';
import { r2 } from '../tarifario';

export type Op = 'fijar' | 'mas' | 'menos' | 'masPct' | 'menosPct';
export const OPS: { id: Op; label: string; campo: string }[] = [
  { id: 'fijar', label: 'Tarifa', campo: 'A' },
  { id: 'mas', label: 'Aumentar monto', campo: 'Monto' },
  { id: 'menos', label: 'Disminuir monto', campo: 'Monto' },
  { id: 'masPct', label: 'Aumentar %', campo: 'Porcentaje' },
  { id: 'menosPct', label: 'Disminuir %', campo: 'Porcentaje' },
];
export const aplicarOp = (actual: number | null, op: Op, v: number): number | null => {
  if (op === 'fijar') return v;
  if (actual === null) return null;
  return r2(Math.max(0, op === 'mas' ? actual + v : op === 'menos' ? actual - v : op === 'masPct' ? actual * (1 + v / 100) : actual * (1 - v / 100)));
};
export const num = (s: string) => (s.trim() === '' || isNaN(Number(s.replace(',', '.'))) ? null : Number(s.replace(',', '.')));

/** Casilla con estado parcial (borde gris claro, se rellena con el color de marca). */
export function Casilla({ estado, label, onChange }: { estado: 'todo' | 'parcial' | 'nada'; label: string; onChange: (b: boolean) => void }) {
  const lleno = estado !== 'nada';
  return (
    <span style={{ position: 'relative', display: 'inline-flex', width: 16, height: 16, flexShrink: 0 }}>
      <input type="checkbox" aria-label={label} checked={estado === 'todo'} ref={el => { if (el) el.indeterminate = estado === 'parcial'; }} onChange={e => onChange(estado === 'parcial' ? true : e.target.checked)}
        style={{ position: 'absolute', inset: 0, width: 16, height: 16, margin: 0, opacity: 0, cursor: 'pointer' }} />
      <span aria-hidden style={{ width: 16, height: 16, borderRadius: 4, boxSizing: 'border-box', border: `1.5px solid ${lleno ? C.brand : '#D6D6DB'}`, background: lleno ? C.brand : C.n000, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
        {estado === 'todo' && <svg width="10" height="10" viewBox="0 0 14 14" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2.33 7L5.25 9.92L11.67 4.08" /></svg>}
        {estado === 'parcial' && <span style={{ width: 8, height: 2, borderRadius: 1, background: '#fff' }} />}
      </span>
    </span>
  );
}

/** Lista con buscador y casilla «todos» en el encabezado (Tipo de habitación, Tarifa). «Todos» marca lo que se ve en la búsqueda. */
export function ListaChecks({ titulo, items, sel, onChange, alto = 220 }: {
  titulo: string; items: { id: string; label: string; nota?: string; resaltado?: boolean }[]; sel: string[]; onChange: (ids: string[]) => void; alto?: number | string;
}) {
  const [q, setQ] = useState('');
  const norm = (x: string) => x.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const visibles = items.filter(i => !q.trim() || norm(i.label).includes(norm(q.trim())));
  const ids = visibles.map(i => i.id);
  const n = ids.filter(id => sel.includes(id)).length;
  const estado = n === 0 ? 'nada' : n === ids.length ? 'todo' : 'parcial';
  return (
    <div style={{ border: `1px solid ${C.n500}`, borderRadius: radius.md, overflow: 'hidden', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: C.brandBg, borderBottom: `1px solid ${C.n500}`, fontSize: 12.5, fontWeight: 500, cursor: 'pointer' }}>
        <Casilla estado={estado} label={`Seleccionar todos: ${titulo}`} onChange={b => onChange(b ? [...new Set([...sel, ...ids])] : sel.filter(x => !ids.includes(x)))} />{titulo}
        <span style={{ marginLeft: 'auto', fontSize: 11, color: C.n700, fontWeight: 400 }}>{sel.length}/{items.length}</span>
      </label>
      <div style={{ padding: '6px 8px', borderBottom: `1px solid ${C.n500}` }}>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar" aria-label={`Buscar en ${titulo}`} className="suite-campo"
          style={{ width: '100%', height: 28, boxSizing: 'border-box', border: `1px solid ${C.n500}`, borderRadius: radius.control, padding: '0 8px', fontSize: 12, fontFamily: FONT, outline: 'none' }} />
      </div>
      <div style={{ height: alto, overflowY: 'auto', padding: '4px 0' }}>
        {visibles.length === 0 && <p style={{ margin: 0, padding: '10px', fontSize: 12, color: C.n700 }}>Sin resultados.</p>}
        {visibles.map(i => (
          <label key={i.id} title={i.nota} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 10px', fontSize: 12, cursor: 'pointer' }}>
            <Casilla estado={sel.includes(i.id) ? 'todo' : 'nada'} label={i.label} onChange={b => onChange(b ? [...sel, i.id] : sel.filter(x => x !== i.id))} />
            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: i.resaltado ? C.brand : C.n900, fontStyle: i.resaltado ? 'italic' : 'normal' }}>{i.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

/** Sección del formulario: título y contenido, separada de la anterior por una línea (la primera, sin línea). */
export function Seccion({ titulo, children, primera }: { titulo: string; children: ReactNode; primera?: boolean }) {
  return (
    <section aria-label={titulo} style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingTop: primera ? 0 : 14, borderTop: primera ? undefined : `1px solid ${C.n500}` }}>
      <h3 style={{ margin: 0, fontSize: 13, fontWeight: 600, color: C.n900 }}>{titulo}</h3>
      {children}
    </section>
  );
}

export const LinkBtn = ({ onClick, children }: { onClick: () => void; children: ReactNode }) =>
  <button type="button" onClick={onClick} style={{ border: 'none', background: 'none', color: C.brand, fontSize: 12, fontFamily: FONT, cursor: 'pointer', padding: '2px 0', alignSelf: 'flex-start' }}>{children}</button>;
export const Nota = ({ children }: { children: ReactNode }) => <p style={{ margin: 0, fontSize: 11, color: C.n700, lineHeight: 1.5 }}>{children}</p>;

export function Num({ value, onChange, label, afijo, placeholder = '0.00' }: { value: string; onChange: (v: string) => void; label: string; afijo?: string; placeholder?: string }) {
  return (
    <span className="suite-afijo" style={{ display: 'flex', alignItems: 'center', gap: 6, height: 32, boxSizing: 'border-box', border: `1px solid ${C.n500}`, borderRadius: radius.control, padding: '0 10px', background: C.n000 }}>
      {afijo && <span style={{ fontSize: 11.5, color: C.n700 }}>{afijo}</span>}
      <input value={value} onChange={e => onChange(e.target.value.replace(/[^\d.,]/g, ''))} inputMode="decimal" placeholder={placeholder} aria-label={label}
        style={{ flex: 1, minWidth: 0, border: 'none', fontSize: 12, fontFamily: FONT, textAlign: 'right', outline: 'none', background: 'transparent' }} />
    </span>
  );
}
