'use client';
// Actualización colectiva del Tarifario: operaciones de precio y piezas de la interfaz (pasos, bloques, casillas, chips y campos).
import { type CSSProperties, type ReactNode } from 'react';
import { C, FONT, fmtNum, radius } from '@/components/suite/tokens';
import { Switch } from '@/components/suite/ui';
import { fecha, r2, sumar } from '../tarifario';

export type Op = 'fijar' | 'mas' | 'menos' | 'masPct' | 'menosPct';
export const OPS: { id: Op; label: string; afijo: string }[] = [
  { id: 'fijar', label: 'Fijar precio en', afijo: '$' },
  { id: 'mas', label: 'Aumentar monto', afijo: '+$' },
  { id: 'menos', label: 'Disminuir monto', afijo: '−$' },
  { id: 'masPct', label: 'Aumentar %', afijo: '+%' },
  { id: 'menosPct', label: 'Disminuir %', afijo: '−%' },
];
export const aplicarOp = (actual: number | null, op: Op, v: number): number | null => {
  if (op === 'fijar') return v;
  if (actual === null) return null;
  return r2(Math.max(0, op === 'mas' ? actual + v : op === 'menos' ? actual - v : op === 'masPct' ? actual * (1 + v / 100) : actual * (1 - v / 100)));
};
export type Tri = '' | 'si' | 'no';
export const num = (s: string) => (s.trim() === '' || isNaN(Number(s.replace(',', '.'))) ? null : Number(s.replace(',', '.')));
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
export const corto = (d: string) => `${fecha(d).getDate()} ${MESES[fecha(d).getMonth()]}`;
export const finDeMes = (d: string) => { const f = fecha(d); return sumar(d, new Date(f.getFullYear(), f.getMonth() + 1, 0).getDate() - f.getDate()); };

// ── Piezas ──────────────────────────────────────────────────────────────────
export const thM: CSSProperties = { position: 'sticky', top: 0, background: C.n000, padding: '8px 6px', fontSize: 11.5, fontWeight: 500, color: C.n900, borderBottom: `1px solid ${C.n500}`, zIndex: 2 };
export const tdP: CSSProperties = { padding: '6px 8px', whiteSpace: 'nowrap' };
export const selectS: CSSProperties = { height: 32, border: `1px solid ${C.n500}`, borderRadius: radius.control, padding: '0 8px', fontSize: 12, fontFamily: FONT, background: C.n000, width: '100%' };

export function Paso({ n, titulo, sub }: { n: number; titulo: string; sub?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ width: 20, height: 20, borderRadius: '50%', background: C.brand, color: '#fff', fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{n}</span>
      <span style={{ fontSize: 13, fontWeight: 600 }}>{titulo}</span>
      {sub && <span style={{ fontSize: 12, color: C.n700, marginLeft: 'auto' }}>{sub}</span>}
    </div>
  );
}
export function Bloque({ titulo, on, onChange, children }: { titulo: string; on: boolean; onChange: (b: boolean) => void; children: ReactNode }) {
  return (
    <section aria-label={titulo} style={{ border: `1px solid ${on ? C.brandBd : C.n500}`, borderRadius: radius.md, padding: 12, display: 'flex', flexDirection: 'column', gap: 10, background: on ? C.n000 : C.n200 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 12.5, fontWeight: 600, color: on ? C.n900 : C.n700 }}>{titulo}</span>
        <Switch checked={on} onChange={onChange} label={<span style={{ fontSize: 11.5, color: C.n700 }}>{on ? 'Se actualiza' : 'Sin cambios'}</span>} />
      </div>
      {on && children}
    </section>
  );
}
/** Casilla con estado parcial (mismo aspecto que las casillas de tablas: borde gris claro, marca de la marca). */
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
export function Chip({ on, onClick, children, cuadrado }: { on: boolean; onClick: () => void; children: ReactNode; cuadrado?: boolean }) {
  return (
    <button type="button" aria-pressed={on} onClick={onClick}
      style={{ height: 28, minWidth: cuadrado ? 40 : undefined, padding: '0 10px', borderRadius: cuadrado ? radius.control : radius.pill, border: `1px solid ${on ? C.brand : C.n500}`, background: on ? C.brandBg : C.n000, color: on ? C.brand : C.n900, fontSize: 12, fontFamily: FONT, cursor: 'pointer', whiteSpace: 'nowrap' }}>{children}</button>
  );
}
export const LinkBtn = ({ onClick, children }: { onClick: () => void; children: ReactNode }) =>
  <button type="button" onClick={onClick} style={{ border: 'none', background: 'none', color: C.brand, fontSize: 12, fontFamily: FONT, cursor: 'pointer', padding: '2px 4px', alignSelf: 'flex-start' }}>{children}</button>;
export const Nota = ({ children }: { children: ReactNode }) => <p style={{ margin: 0, fontSize: 11, color: C.n700, lineHeight: 1.5 }}>{children}</p>;
export function Num({ value, onChange, label, afijo, sufijo }: { value: string; onChange: (v: string) => void; label: string; afijo: string; sufijo?: boolean }) {
  return (
    <span className="suite-afijo" style={{ display: 'flex', alignItems: 'center', height: 32, border: `1px solid ${C.n500}`, borderRadius: radius.control, background: C.n000, padding: '0 8px', gap: 6 }}>
      {!sufijo && <span style={{ fontSize: 11.5, color: C.n700 }}>{afijo}</span>}
      <input value={value} onChange={e => onChange(e.target.value.replace(/[^\d.,]/g, ''))} inputMode="decimal" placeholder="0.00" aria-label={label}
        style={{ flex: 1, minWidth: 0, border: 'none', outline: 'none', fontSize: 12, fontFamily: FONT, textAlign: 'right', background: 'transparent' }} />
      {sufijo && <span style={{ fontSize: 11.5, color: C.n700 }}>{afijo}</span>}
    </span>
  );
}
export function CampoFecha({ label, value, onChange, min }: { label: string; value: string; onChange: (v: string) => void; min?: string }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 11, color: C.n700 }}>{label}
      <span style={{ position: 'relative', height: 32, border: `1px solid ${C.n500}`, borderRadius: radius.control, padding: '0 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, color: C.n900, background: C.n000 }}>
        {value ? value.split('-').reverse().join('/') : 'dd/mm/aaaa'}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} aria-hidden><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></svg>
        <input type="date" value={value} min={min} onChange={e => onChange(e.target.value)} aria-label={label}
          onClick={e => (e.currentTarget as HTMLInputElement & { showPicker?: () => void }).showPicker?.()}
          style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%' }} />
      </span>
    </label>
  );
}
export function Cambio({ a, b }: { a: number | boolean | null; b: number | boolean | null }) {
  const f = (v: number | boolean | null) => (typeof v === 'number' ? fmtNum(v) : '---');
  if (f(a) === f(b)) return <span style={{ color: C.n700 }}>{f(a)}</span>;
  return <span><span style={{ color: C.n700, textDecoration: 'line-through' }}>{f(a)}</span> <span aria-hidden>→</span> <b style={{ fontWeight: 600, color: C.brand }}>{f(b)}</b></span>;
}
